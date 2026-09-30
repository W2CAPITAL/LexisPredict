import crypto from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {chatAIFlow} from '@/ai/flows/chat-ai-flow';
import {gerarRascunhoEstrategico} from '@/ai/motor-despacho';
import {fetchDataJud,searchDataJudByCpf,searchDataJudByNome} from '@/lib/datajud';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function configuredKeys(){
  const single=String(process.env.LEXISPREDICT_API_KEY||'').trim();
  const shared=String(process.env.SHEETSPREDICT_INTEGRATION_KEY||'').trim();
  const many=String(process.env.LEXISPREDICT_API_KEYS||'').split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
  return [...new Set([single,shared,...many].filter(Boolean))];
}
function bearer(req:NextRequest){
  const raw=String(req.headers.get('authorization')||'');
  return raw.toLowerCase().startsWith('bearer ')?raw.slice(7).trim():'';
}
function sameSecret(a:string,b:string){
  if(!a||!b)return false;
  const aa=Buffer.from(a),bb=Buffer.from(b);
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function requireService(req:NextRequest){
  const expected=configuredKeys();
  if(!expected.length)return NextResponse.json({ok:false,error:'Integração de serviço indisponível.'},{status:503});
  if(!expected.some(key=>sameSecret(bearer(req),key)))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  return null;
}
function clean(value:unknown,max=12000){
  return String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
}
function serviceInfo(extra:Record<string,unknown>={}){
  return {
    ok:true,
    service:'lexispredict',
    capabilities:['datajud','chat','dispatch'],
    tenantDataExposed:false,
    ...extra
  };
}

export async function GET(req:NextRequest){
  const expected=configuredKeys();
  const supplied=bearer(req);
  const configured=expected.length>0;
  const authorized=configured&&expected.some(key=>sameSecret(supplied,key));
  return NextResponse.json(serviceInfo({
    configured,authorized,
    requiredEnv:configured?undefined:['LEXISPREDICT_API_KEY','LEXISPREDICT_API_KEYS','SHEETSPREDICT_INTEGRATION_KEY']
  }),{status:200,headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:NextRequest){
  const denied=requireService(req);if(denied)return denied;
  try{
    const body=await req.json().catch(()=>({}));
    const action=clean(body.action,40).toLowerCase();

    if(action==='status'||action==='capabilities'){
      return NextResponse.json(serviceInfo(),{headers:{'Cache-Control':'no-store'}});
    }

    if(action==='datajud'){
      const mode=clean(body.mode,20).toLowerCase();
      const query=clean(body.query,240);
      if(!query)return NextResponse.json({ok:false,error:'Query vazia.'},{status:400});
      if(mode==='cpf'){
        const result=await searchDataJudByCpf(query,{onlyBA:!!body.onlyBA,size:Math.max(1,Math.min(25,Number(body.size)||12))});
        return NextResponse.json({ok:true,mode,result},{headers:{'Cache-Control':'no-store'}});
      }
      if(mode==='nome'){
        const result=await searchDataJudByNome(query,{size:Math.max(1,Math.min(25,Number(body.size)||12))});
        return NextResponse.json({ok:true,mode,result},{headers:{'Cache-Control':'no-store'}});
      }
      if(mode==='cnj'){
        const result=await fetchDataJud(query,1,{fast:false});
        return NextResponse.json({ok:!result.error,mode,result,error:result.message},{headers:{'Cache-Control':'no-store'}});
      }
      return NextResponse.json({ok:false,error:'Modo inválido.'},{status:400});
    }

    if(action==='chat'){
      const prompt=clean(body.prompt||body.message,18000);
      if(!prompt)return NextResponse.json({ok:false,error:'Mensagem vazia.'},{status:400});
      const result=await chatAIFlow({
        pergunta:prompt,
        historico:Array.isArray(body.history)?body.history.slice(-10):undefined,
        preferred:clean(body.preferred||'omni',80),
        preferredModel:clean(body.preferredModel,120)||undefined,
        tribunalContext:clean(body.tribunalContext,12000)||undefined,
        baClaudeDjen:!!body.baClaudeDjen
      });
      return NextResponse.json({ok:true,result},{headers:{'Cache-Control':'no-store'}});
    }

    if(action==='dispatch'){
      const movimentos=Array.isArray(body.movimentos)?body.movimentos.slice(0,24).map((m:any)=>({
        dataHora:clean(m?.dataHora||m?.data,80),
        nome:clean(m?.nome||m?.tipo,500),
        complemento:clean(m?.complemento,1800),
        descricao:clean(m?.descricao||m?.texto,2400)
      })):[];
      const djenTexts=Array.isArray(body.djenTexts)?body.djenTexts.slice(0,12).map((x:unknown)=>clean(x,4000)).filter(Boolean):[];
      const eventoTipo=(clean(body.eventoTipo,80)||null) as any;
      const canalRaw=clean(body.canal,20).toLowerCase();
      const canal=(['whatsapp','email','interno'].includes(canalRaw)?canalRaw:'whatsapp') as 'whatsapp'|'email'|'interno';
      const result=await gerarRascunhoEstrategico({
        clienteNome:clean(body.clienteNome||body.cliente,180)||'Cliente',
        protocolo:clean(body.protocolo||body.cnj,80),
        ultimoRetorno:clean(body.ultimoRetorno,80)||null,
        movimentos,
        djenTexts,
        eventoTipo,
        eventoResumo:clean(body.eventoResumo,1000)||null,
        preferredModel:clean(body.preferredModel||'omni',80),
        canal,
        tem_novo_andamento:!!body.temNovoAndamento,
        datajud_encerrado_tribunal:!!body.encerradoTribunal,
        indicio_busca_apreensao:!!body.indicioBuscaApreensao,
        em_cumprimento_sentenca:!!body.emCumprimento,
        datajud_ultimo_nome:clean(body.datajudUltimoNome,500)||null,
        cumprimento_pendente_necessario:!!body.cumprimentoPendente,
        is_procedente:!!body.procedente,
        oportunidade_elegivel:!!body.oportunidadeElegivel,
        oportunidade_score:Number.isFinite(Number(body.oportunidadeScore))?Number(body.oportunidadeScore):null,
        oportunidade_tipo_credito:clean(body.oportunidadeTipoCredito,120)||null,
        oportunidade_dias_apos_transito:Number.isFinite(Number(body.diasAposTransito))?Number(body.diasAposTransito):null,
        texto_pobre:!!body.textoPobre
      });
      return NextResponse.json({ok:true,result},{headers:{'Cache-Control':'no-store'}});
    }

    return NextResponse.json({ok:false,error:'Ação desconhecida.'},{status:400});
  }catch{
    return NextResponse.json({ok:false,error:'Falha na integração de serviço.'},{status:500});
  }
}
