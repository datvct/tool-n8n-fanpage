import test, {afterEach, mock} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {prisma} from '../lib/db.ts';
import {POST as importContent} from '../app/api/contents/import/route.ts';
import {PATCH as updatePost} from '../app/api/social-posts/[id]/route.ts';
import {POST as callback} from '../app/api/publish/callback/route.ts';
import {GET as creator} from '../app/api/tiktok/creator/route.ts';

const options={privacyLevel:'SELF_ONLY',allowComment:false,allowDuet:false,allowStitch:false,brandOrganic:false,brandContent:false,isAigc:false};
const media=[{id:'media-1',fileName:'clip.mp4',fileUrl:'https://drive.google.com/uc?id=video-id',mimeType:'video/mp4'}];
const post={id:'post-1',platform:'tiktok',postType:'tiktok_video',content:'Demo #test',status:'draft',tiktokOptions:options,scheduledAt:null,item:{employeeName:'User',originalNote:'Note',media}};
const ctx={params:Promise.resolve({id:'post-1'})};
function request(body,key='') {return new NextRequest('http://localhost/api/test',{method:'POST',headers:{'Content-Type':'application/json','x-n8n-key':key,'x-publish-key':key},body:JSON.stringify(body)});}
const savedEnv={...process.env};
const restores=[];
function stub(object,key,fn){const original=object[key];const mocked=mock.fn(fn);object[key]=mocked;restores.push(()=>{object[key]=original;});return mocked;}
afterEach(()=>{while(restores.length)restores.pop()();mock.restoreAll();for(const key of ['N8N_IMPORT_API_KEY','N8N_PUBLISH_CALLBACK_KEY','N8N_PUBLISH_WEBHOOK_URL','TIKTOK_ACCESS_TOKEN']){if(savedEnv[key]===undefined)delete process.env[key];else process.env[key]=savedEnv[key];}});

test('import authenticates and rejects TikTok without a video',async()=>{
  process.env.N8N_IMPORT_API_KEY='test';
  assert.equal((await importContent(request({sourceRowId:'row-1',tiktokContent:'Demo'}))).status,401);
  const response=await importContent(request({sourceRowId:'row-1',tiktokContent:'Demo'},'test'));
  assert.equal(response.status,400);assert.equal((await response.json()).error.code,'MISSING_TIKTOK_VIDEO');
});

test('TikTok-only import persists video and tiktok_video social post',async()=>{
  delete process.env.N8N_IMPORT_API_KEY;
  stub(prisma.contentItem,'findUnique',async()=>null);
  let data;
  stub(prisma.contentItem,'create',async args=>{data=args.data;return {id:'content-1',...data};});
  const response=await importContent(request({sourceRowId:'row-1',tiktokContent:'Caption',videoFileId:'drive-id'}));
  assert.equal(response.status,201);
  assert.deepEqual(data.socialPosts.create,[{platform:'tiktok',postType:'tiktok_video',content:'Caption'}]);
  assert.equal(data.media.create[0].mimeType,'video/mp4');
});

test('reimport cannot replace an approved TikTok video',async()=>{
  delete process.env.N8N_IMPORT_API_KEY;
  stub(prisma.contentItem,'findUnique',async()=>({socialPosts:[{platform:'tiktok',status:'approved'}]}));
  const response=await importContent(request({sourceRowId:'row-1',tiktokContent:'New caption',videoFileId:'different-video'}));
  assert.equal(response.status,409);
});

test('approval rejects missing privacy, long caption, and multiple videos before writing',async()=>{
  let current={...post,tiktokOptions:null};
  stub(prisma.socialPost,'findUnique',async()=>current);
  const write=stub(prisma.socialPost,'update',async()=>{throw Error('must not write');});
  assert.equal((await updatePost(request({status:'approved'}),ctx)).status,400);
  current={...post};
  assert.equal((await updatePost(request({content:'a'.repeat(2201)}),ctx)).status,400);
  current={...post,item:{...post.item,media:[...media,...media]}};
  assert.equal((await updatePost(request({status:'approved'}),ctx)).status,400);
  assert.equal(write.mock.callCount(),0);
});

test('scheduled TikTok cannot be edited or dispatched again',async()=>{
  stub(prisma.socialPost,'findUnique',async()=>({...post,status:'scheduled'}));
  assert.equal((await updatePost(request({content:'Changed'}),ctx)).status,409);
  assert.equal((await updatePost(request({status:'scheduled',scheduledAt:'2030-01-01 09:00'}),ctx)).status,409);
});

test('scheduling validates account and forwards options plus timezone to n8n',async()=>{
  process.env.TIKTOK_ACCESS_TOKEN='server-only-token';
  process.env.N8N_PUBLISH_WEBHOOK_URL='https://n8n.example/webhook/schedule';
  const scheduledAt=new Date('2030-01-01T02:00:00Z');
  let updated=false;let webhook;
  stub(prisma.socialPost,'findUnique',async()=>({...post,status:updated?'scheduled':'approved',scheduledAt:updated?scheduledAt:null}));
  stub(prisma.socialPost,'update',async args=>{assert.equal(args.where.status,'approved');updated=true;return {...post,...args.data};});
  mock.method(globalThis,'fetch',async(url,init)=>{
    if(String(url).includes('creator_info'))return Response.json({error:{code:'ok'},data:{privacy_level_options:['SELF_ONLY']}});
    webhook=JSON.parse(init.body);return Response.json({success:true});
  });
  const response=await updatePost(request({status:'scheduled',scheduledAt:'2030-01-01 09:00'}),ctx);
  assert.equal(response.status,200);
  assert.equal(webhook.scheduledAt,'2030-01-01T09:00:00+07:00');
  assert.equal(webhook.scheduledAtUtc,'2030-01-01T02:00:00.000Z');
  assert.deepEqual(webhook.tiktokOptions,options);
  assert.equal(webhook.media[0].mimeType,'video/mp4');
  assert.ok(!JSON.stringify(webhook).includes('server-only-token'));
});

test('missing scheduler URL does not change approved status',async()=>{
  delete process.env.N8N_PUBLISH_WEBHOOK_URL;process.env.TIKTOK_ACCESS_TOKEN='test';
  stub(prisma.socialPost,'findUnique',async()=>({...post,status:'approved'}));
  mock.method(globalThis,'fetch',async()=>Response.json({error:{code:'ok'},data:{privacy_level_options:['SELF_ONLY']}}));
  const write=stub(prisma.socialPost,'update',async()=>post);
  assert.equal((await updatePost(request({status:'scheduled',scheduledAt:'2030-01-01 09:00'}),ctx)).status,503);
  assert.equal(write.mock.callCount(),0);
});

test('creator route never returns bearer token and handles TikTok API errors',async()=>{
  process.env.TIKTOK_ACCESS_TOKEN='secret';
  mock.method(globalThis,'fetch',async()=>Response.json({error:{code:'ok'},data:{privacy_level_options:['SELF_ONLY'],creator_username:'demo',access_token:'must-not-return'}}));
  const response=await creator();assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.data.creator_username,'demo');assert.equal(data.data.access_token,undefined);
  mock.restoreAll();
  mock.method(globalThis,'fetch',async()=>Response.json({error:{code:'access_token_invalid'}}));
  assert.equal((await creator()).status,503);
});

test('callback authenticates and records published/failed against stored TikTok platform',async()=>{
  process.env.N8N_PUBLISH_CALLBACK_KEY='callback-key';
  assert.equal((await callback(request({postId:'post-1',status:'published'}))).status,401);
  let written,logged;
  stub(prisma,'$transaction',async fn=>fn({socialPost:{findUnique:async()=>post,update:async args=>{written=args.data;return {...post,...written};}},publishLog:{create:async args=>{logged=args.data;}}}));
  assert.equal((await callback(request({postId:'post-1',platform:'facebook',status:'published',externalPostId:'pub-1'},'callback-key'))).status,200);
  assert.equal(written.status,'published');assert.equal(written.externalPostId,'pub-1');assert.equal(logged.platform,'tiktok');
  assert.equal((await callback(request({postId:'post-1',status:'failed',errorMessage:'duration_check_failed'},'callback-key'))).status,200);
  assert.equal(written.status,'failed');assert.equal(written.errorMessage,'duration_check_failed');
});
