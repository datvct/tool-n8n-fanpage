import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sheet = JSON.parse(fs.readFileSync('workflow-receive-google-sheet.json'));
const publish = JSON.parse(fs.readFileSync('workflow-webhook-receiver.json'));
const trigger = JSON.parse(fs.readFileSync('workflow-publish-trigger.json'));
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
const options = {privacyLevel:'SELF_ONLY',allowComment:false,allowDuet:false,allowStitch:false,brandOrganic:false,brandContent:false,isAigc:false};
const payload = {postId:'post-1',platform:'tiktok',postType:'tiktok_video',content:'Caption #test',scheduledAt:'2030-01-01T09:00:00+07:00',tiktokOptions:options,media:[{url:'https://drive.google.com/file/d/video-id/view',mimeType:'video/mp4',fileName:'clip.mp4'}]};
async function run(workflow, name, data, previous = {}, helpers = {}, binary, runIndex = 0) {
  const n = workflow.nodes.find(n=>n.name===name);
  const item = {json:data,binary};
  const input = {first:()=>item,all:()=>[item]};
  const lookup = name => ({first:(_branch,index) => {
    const value = previous[name];
    if (typeof value === 'function') return value(index);
    return value;
  }});
  return new AsyncFunction('$json','$input','$','$runIndex',n.parameters.jsCode).call({helpers},data,input,lookup,runIndex);
}

test('all workflow code parses and all connection targets exist',()=>{
  for(const workflow of [sheet,publish,trigger]){
    const names = new Set(workflow.nodes.map(n=>n.name));
    for(const n of workflow.nodes) if(n.type==='n8n-nodes-base.code') new AsyncFunction(n.parameters.jsCode);
    for(const outputs of Object.values(workflow.connections))
      for(const edges of Object.values(outputs)) for(const branch of edges) for(const edge of branch) assert.ok(names.has(edge.node),edge.node);
  }
  const branch = publish.nodes.find(n=>n.name==='Switch').parameters.rules.values.findIndex(r=>r.outputKey==='TikTok');
  assert.equal(publish.connections.Switch.main[branch][0].node,'Prepare TikTok Video');
  assert.equal(publish.connections['Loop TikTok Chunks'].main[1][0].node,'Upload TikTok Chunk');
  assert.equal(publish.connections['TikTok Publish Complete'].main[0][0].node,'Callback Backend Published TikTok');
});

test('Sheet TikTok row -> AI -> import payload includes only TikTok',async()=>{
  const row = (await run(sheet,'Chuẩn hóa row và nền tảng',{'Loại nội dung':'TikTok Video','Nền tảng':'TikTok','Video TikTok':'https://drive.google.com/file/d/video-id/view','Caption TikTok':'Demo caption','Dấu thời gian':'row-1'}))[0].json._row;
  assert.equal(row.postType,'tiktok_video');
  assert.equal(row.video.fileId,'video-id');
  const parsed = (await run(sheet,'Parse JSON AI Final',{output:'{"tiktok":"Demo #epcb","facebook":"unexpected","youtube":"unexpected"}'},{'Chuẩn hóa row và nền tảng':{json:{_row:row}}}))[0].json;
  const body = (await run(sheet,'Tạo payload PostgreSQL',parsed))[0].json;
  assert.equal(body.tiktokContent,'Demo #epcb');
  assert.equal(body.facebookContent,'');assert.equal(body.linkedinContent,'');assert.equal(body.youtubeContent,'');
  assert.equal(body.videoFileId,'video-id');
});

test('TikTok platform infers video type; missing Drive video fails early',async()=>{
  const row=(await run(sheet,'Chuẩn hóa row và nền tảng',{'Nền tảng':'TikTok','Video TikTok':'https://drive.google.com/open?id=id123'}))[0].json._row;
  assert.equal(row.postType,'tiktok_video');
  await assert.rejects(run(sheet,'Chuẩn hóa row và nền tảng',{'Loại nội dung':'TikTok Video'}),/Google Drive/);
});

test('Facebook and YouTube Sheet normalization remains supported',async()=>{
  for(const [type,field,platform] of [['Facebook Reel','Video Reel','facebook'],['YouTube Short','Video Short','youtube'],['YouTube video thường','Video thường','youtube']]){
    const row=(await run(sheet,'Chuẩn hóa row và nền tảng',{'Loại nội dung':type,[field]:'https://drive.google.com/file/d/legacy-video/view'}))[0].json._row;
    assert.equal(row.platform,platform);assert.equal(row.video.fileId,'legacy-video');assert.equal(row.targetTikTok,false);
  }
});

test('scheduler and receiver preserve TikTok settings',async()=>{
  const scheduled=(await run(trigger,'Kiểm tra yêu cầu đăng',{body:payload}))[0].json;
  assert.deepEqual(scheduled.tiktokOptions,options);
  assert.equal(scheduled.scheduledAt,'2030-01-01T02:00:00.000Z');
  const normalized=await run(publish,'Chuẩn hóa dữ liệu publish',{body:scheduled});
  assert.deepEqual(normalized.json.tiktokOptions,options);
  const prepared=(await run(publish,'Prepare TikTok Video',normalized.json))[0].json;
  assert.match(prepared.video_url,/export=download/);
  await assert.rejects(run(publish,'Prepare TikTok Video',{...payload,media:[]}),/đúng một video/);
  await assert.rejects(run(publish,'Prepare TikTok Video',{...payload,content:'a'.repeat(2201)}),/2200/);
  await assert.rejects(run(publish,'Prepare TikTok Video',{...payload,tiktokOptions:{}}),/quyền riêng tư/);
});

test('creator API error and unsupported privacy cannot initialize publishing',async()=>{
  const previous={'Prepare TikTok Video':{json:payload}};
  await assert.rejects(run(publish,'Validate TikTok Creator',{error:{code:'access_token_invalid'}},previous),/access_token_invalid/);
  await assert.rejects(run(publish,'Validate TikTok Creator',{error:{code:'ok'},data:{privacy_level_options:['PUBLIC_TO_EVERYONE']}},previous),/Quyền riêng tư/);
});

test('Drive HTML rejected and MP4 chunks obey sequential upload byte ranges',async()=>{
  const previous={'Validate TikTok Creator':{json:payload}};
  await assert.rejects(run(publish,'Measure TikTok Video',{},previous,{getBinaryDataBuffer:async()=>Buffer.from('<!doctype html>login')},{data:{mimeType:'text/html'}}),/HTML/);
  // 65 MiB must become 32 MiB + 33 MiB (trailing bytes merged into last chunk).
  const buffer=Buffer.alloc(65*1024**2);buffer.write('ftypisom',4);
  const helpers={getBinaryDataBuffer:async()=>buffer,prepareBinaryData:async b=>({bytes:b.length})};
  const measured=(await run(publish,'Measure TikTok Video',{},previous,helpers,{data:{mimeType:'application/octet-stream'}}))[0].json;
  assert.equal(measured.total_chunk_count,2);assert.equal(measured.video_mime,'video/mp4');
  const chunks=await run(publish,'Split TikTok Video Chunks',{...measured,upload_url:'https://upload.us.tiktokapis.com/video/'},{},helpers);
  assert.equal(chunks.length,2);
  assert.equal(chunks[0].json.content_range,`bytes 0-${32*1024**2-1}/${buffer.length}`);
  assert.equal(chunks[1].json.content_range,`bytes ${32*1024**2}-${buffer.length-1}/${buffer.length}`);
  assert.equal(chunks.reduce((sum,c)=>sum+c.binary.data.bytes,0),buffer.length);
});

test('TikTok init checks API error even with HTTP 200',async()=>{
  await assert.rejects(run(publish,'Validate TikTok Upload Session',{error:{code:'spam_risk_too_many_posts'}}),/spam_risk/);
});

test('processing loops, completion succeeds, FAILED and timeout never report published',async()=>{
  const previous={'Wait TikTok Processing':index=>({json:{publish_id:'pub-1',pollCount:index}})};
  const pending=(await run(publish,'Evaluate TikTok Status',{error:{code:'ok'},data:{status:'PROCESSING_UPLOAD'}},previous,{},undefined,3))[0].json;
  assert.equal(pending.complete,false);assert.equal(pending.pollCount,4);
  const complete=(await run(publish,'Evaluate TikTok Status',{error:{code:'ok'},data:{status:'PUBLISH_COMPLETE',publicaly_available_post_id:['1234567890123456789']}},previous))[0].json;
  assert.equal(complete.complete,true);assert.equal(complete.externalPostId,'1234567890123456789');
  const privateComplete=(await run(publish,'Evaluate TikTok Status',{error:{code:'ok'},data:{status:'PUBLISH_COMPLETE'}},previous))[0].json;
  assert.equal(privateComplete.externalPostId,'pub-1');
  await assert.rejects(run(publish,'Evaluate TikTok Status',{error:{code:'ok'},data:{status:'FAILED',fail_reason:'duration_check_failed'}},previous),/duration_check_failed/);
  await assert.rejects(run(publish,'Evaluate TikTok Status',{error:{code:'ok'},data:{status:'PROCESSING_UPLOAD'}},previous,{},undefined,119),/tránh trùng video/);
});

test('AI caption is read from fenced JSON',async()=>{
  const result=await run(sheet,'Parse JSON AI Final',{output:'```json\n{"tiktok":"Caption from AI"}\n```'},{'Chuẩn hóa row và nền tảng':{json:{_row:{targetTikTok:true,note:'Fallback'}}}});
  assert.equal(result[0].json.tt_content,'Caption from AI');
});

test('small video uploads in one complete chunk',async()=>{
  const buffer=Buffer.alloc(1024);buffer.write('ftypisom',4);
  const helpers={getBinaryDataBuffer:async()=>buffer,prepareBinaryData:async b=>({bytes:b.length})};
  const measured=(await run(publish,'Measure TikTok Video',{}, {'Validate TikTok Creator':{json:payload}},helpers,{data:{mimeType:'video/mp4'}}))[0].json;
  assert.equal(measured.chunk_size,1024);assert.equal(measured.total_chunk_count,1);
  const chunks=await run(publish,'Split TikTok Video Chunks',measured,{},helpers);
  assert.equal(chunks[0].json.content_range,'bytes 0-1023/1024');
});
