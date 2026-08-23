import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
const SAFE_MODE=!!window.__SELF_HEAL?.safeMode;

const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('game'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();scene.background=new THREE.Color(0x7fb6de);scene.fog=new THREE.FogExp2(0xa9c8d4,.012);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,500);
const hemi=new THREE.HemisphereLight(0xddeeff,0x24331f,1.2);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffefd4,2.7);sun.position.set(35,60,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

const world=new THREE.Group();scene.add(world);
const mat=(c,r=.9,m=.02)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const blockGeo=new THREE.BoxGeometry(1,1,1);
const blockMats={
 grass:mat(0x5c8f46,1),dirt:mat(0x795536,1),stone:mat(0x6d7074,.95),sand:mat(0xb69a61,1),
 snow:mat(0xd8e4e8,.9),lava:mat(0xc94b20,.55),wood:mat(0x6f4d2f,1),leaf:mat(0x2f6934,1),
 water:new THREE.MeshPhysicalMaterial({color:0x4f8db8,transparent:true,opacity:.72,roughness:.15,transmission:.08})
};

const WORLD_SIZE=64;

const CHUNK_SIZE=24;
const chunkState=new Map();
function chunkKey(cx,cz){return `${cx},${cz}`}
function ensureChunk(cx,cz){
  const k=chunkKey(cx,cz);if(chunkState.has(k))return;
  const g=new THREE.Group();g.userData.chunk=k;world.add(g);
  // lightweight landmarks only, not full terrain replacement
  for(let i=0;i<8;i++){
    const x=cx*CHUNK_SIZE+Math.floor(Math.random()*CHUNK_SIZE)-CHUNK_SIZE/2;
    const z=cz*CHUNK_SIZE+Math.floor(Math.random()*CHUNK_SIZE)-CHUNK_SIZE/2;
    if(Math.abs(x)>31||Math.abs(z)>31){
      const y=heightAt(Math.max(-32,Math.min(32,Math.round(x))),Math.max(-32,Math.min(32,Math.round(z))))+1;
      const m=new THREE.Mesh(blockGeo,Math.random()<.25?blockMats.stone:blockMats.wood);
      m.position.set(x,y,z);m.scale.set(1,1+Math.random()*2,1);m.castShadow=true;g.add(m);
    }
  }
  chunkState.set(k,g);
}
function updateChunks(){
  const cx=Math.floor(player.position.x/CHUNK_SIZE),cz=Math.floor(player.position.z/CHUNK_SIZE);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)ensureChunk(cx+dx,cz+dz);
  for(const [k,g] of chunkState){
    const [gx,gz]=k.split(',').map(Number);
    g.visible=Math.abs(gx-cx)<=2&&Math.abs(gz-cz)<=2;
  }
}

const blockMap=new Map();
function key(x,y,z){return `${x}|${y}|${z}`}
function addBlock(x,y,z,type='grass',interactive=false){
 const m=new THREE.Mesh(blockGeo,blockMats[type]||blockMats.grass);m.position.set(x,y,z);m.receiveShadow=true;
 if(type!=='water')m.castShadow=true;m.userData={block:true,type,interactive};world.add(m);blockMap.set(key(x,y,z),m);return m;
}
function heightAt(x,z){
 const region = regionAt(x,z);
 let h=0;
 h+=Math.floor((Math.sin(x*.18)+Math.cos(z*.16))*1.3);
 if(region==='mountain')h+=Math.floor(Math.abs(Math.sin(x*.12)*Math.cos(z*.1))*5);
 if(region==='volcano')h+=Math.floor(Math.abs(Math.sin((x+z)*.1))*3);
 return h;
}
function regionAt(x,z){
 if(x<-15&&z<-10)return 'forest';
 if(x>15&&z<-10)return 'volcano';
 if(x<-15&&z>10)return 'snow';
 if(x>15&&z>10)return 'mountain';
 return 'plains';
}
function regionColor(region){
 return {plains:'草原王国',forest:'古代森林',volcano:'火山荒野',snow:'雪原',mountain:'禁足山岳'}[region];
}
for(let x=-32;x<=32;x++)for(let z=-32;z<=32;z++){
 const h=heightAt(x,z),region=regionAt(x,z);
 const top=region==='snow'?'snow':region==='volcano'?(Math.random()<.08?'lava':'stone'):region==='mountain'?'stone':region==='forest'?'grass':'grass';
 addBlock(x,h,z,top);
 if(h>0) for(let y=h-1;y>=Math.max(-2,h-3);y--) addBlock(x,y,z,y===h-1?'dirt':'stone');
}
for(let x=-6;x<=4;x++)for(let z=8;z<=15;z++) addBlock(x,-1,z,'water');

function tree(x,z){
 const y=heightAt(x,z);
 for(let i=1;i<=3;i++)addBlock(x,y+i,z,'wood');
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)addBlock(x+dx,y+4,z+dz,'leaf');
 addBlock(x,y+5,z,'leaf');
}
for(let i=0;i<70;i++){
 const x=Math.floor(Math.random()*60)-30,z=Math.floor(Math.random()*60)-30;
 if(regionAt(x,z)==='forest'||(regionAt(x,z)==='plains'&&Math.random()<.35))tree(x,z);
}

function voxelHouse(x,z){
 const y=heightAt(x,z)+1;
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  if(Math.abs(dx)===2||Math.abs(dz)===2){addBlock(x+dx,y,z+dz,'wood');addBlock(x+dx,y+1,z+dz,'wood')}
 }
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)addBlock(x+dx,y+2,z+dz,'stone');
}
voxelHouse(5,-2);voxelHouse(10,1);voxelHouse(7,5);
function dungeonGate(x,z){
 const y=heightAt(x,z)+1;
 for(let i=0;i<4;i++){addBlock(x-2,y+i,z,'stone');addBlock(x+2,y+i,z,'stone')}
 for(let dx=-2;dx<=2;dx++)addBlock(x+dx,y+4,z,'stone');
}
dungeonGate(-24,22);

voxelHouse(-8,-6);voxelHouse(-11,-3);voxelHouse(18,18);
dungeonGate(24,-24);dungeonGate(24,24);

function addRuin(x,z,w=4,h=3){
 const y=heightAt(x,z)+1;
 for(let dx=-w;dx<=w;dx++){
   addBlock(x+dx,y,z,'stone');
   if(dx%2===0)addBlock(x+dx,y+1,z,'stone');
 }
 for(let dz=1;dz<=h;dz++){
   addBlock(x-w,y,z+dz,'stone');
   addBlock(x+w,y,z+dz,'stone');
 }
}
function addWatchTower(x,z){
 const y=heightAt(x,z)+1;
 for(let i=0;i<5;i++){addBlock(x,y+i,z,'stone');if(i===4){addBlock(x+1,y+i,z,'stone');addBlock(x-1,y+i,z,'stone');}}
}
function addSecretChest(x,z,label='古びた宝箱'){
 const y=heightAt(x,z)+1;
 const c=addBlock(x,y,z,'wood');c.userData.chest=true;c.userData.opened=false;c.userData.label=label;
}
addRuin(-18,-5,5,4);
addRuin(16,-12,4,3);
addWatchTower(-8,20);
addWatchTower(20,5);
addSecretChest(-17,-3,'遺跡の宝箱');
addSecretChest(17,-10,'火山道の宝箱');
addSecretChest(-5,22,'監視塔の宝箱');

const warpPoints=[
 {name:'草原王都',x:4,z:-2},
 {name:'古代森林',x:-24,z:-18},
 {name:'火山荒野',x:24,z:-20},
 {name:'雪原',x:-22,z:22},
 {name:'禁足山岳',x:24,z:24}
];


function npcMarker(x,z,color=0xe4c46a){
 const y=heightAt(x,z)+1;
 const g=humanoid(color,.72);g.position.set(x,y,z);scene.add(g);return g;
}
const npcElder=npcMarker(7,-1,0xb98a63);
const npcSmith=npcMarker(-9,-4,0x8b8f99);
const npcSeer=npcMarker(19,18,0x9c78d4);

const dialogBox=document.getElementById('dialogBox'),dialogName=document.getElementById('dialogName'),dialogText=document.getElementById('dialogText'),dialogChoices=document.getElementById('dialogChoices');
const NPC_DIALOGS=[
 {obj:npcElder,name:'王都長老',lines:[
   {text:'最近、世界の境界が揺らいでいる。君は何を優先する？',choices:[['人々を守る','protect'],['強敵を追う','hunt'],['真相を探る','truth']]}
 ]},
 {obj:npcSmith,name:'鍛冶師ガンツ',lines:[
   {text:'良い素材を持っているな。強化に回すか、売るか？',choices:[['強化を優先','forge'],['金策を優先','gold']]}
 ]},
 {obj:npcSeer,name:'星読みミラ',lines:[
   {text:'あなたの行動で未来が分岐している。どの道を見る？',choices:[['宿敵の未来','nemesis'],['ユニークの未来','unique'],['世界の未来','world']]}
 ]}
];
function openNPCDialog(npc){
 const d=NPC_DIALOGS.find(x=>x.obj===npc);if(!d)return;
 const node=d.lines[0];dialogName.textContent=d.name;dialogText.textContent=node.text;dialogChoices.innerHTML='';
 node.choices.forEach(([label,tag])=>{
   const b=document.createElement('button');b.className='small';b.textContent=label;b.onclick=()=>chooseNPC(tag,d.name);dialogChoices.appendChild(b);
 });
 dialogBox.style.display='block';AUDIO.ui();
}
function chooseNPC(tag,name){
 personalStory.history.unshift(`${name}:${tag}`);
 if(tag==='protect'){state.maxHp+=8;state.hp+=8;storyPush('王都防衛に力を貸す決意をした')}
 if(tag==='hunt'){personalWorld.dangerBias+=.15;storyPush('より危険な敵を追う道を選んだ')}
 if(tag==='truth'){personalWorld.eventBias=(personalWorld.eventBias||1)+.2;storyPush('世界の真相を探る道を選んだ')}
 if(tag==='forge'){mats.iron+=1;feed('⚒️ 鍛冶師から鉄を受け取った')}
 if(tag==='gold'){state.gold+=120;feed('💰 鍛冶師から取引資金を得た')}
 if(tag==='nemesis')nemesis.rank=Math.max(1,nemesis.rank-1);
 if(tag==='unique')personalWorld.eventBias=(personalWorld.eventBias||1)+.25;
 if(tag==='world')worldPersonalDecision(true);
 dialogBox.style.display='none';
}



let baseCamp={x:4,z:-4,level:1,chest:0};


const personalStory={
 chapter:1,
 faction:'王都',
 tone:'awakening',
 flags:{firstBoss:false,firstUnique:false,deepExplorer:false,builder:false},
 current:'王都から旅立ったばかり',
 history:[]
};
function storyPush(t){
 if(personalStory.current===t)return;
 personalStory.current=t;personalStory.history.unshift(t);personalStory.history=personalStory.history.slice(0,12);
 document.getElementById('storyChip').textContent='物語：'+t;
 feed('📖 '+t);
}
function updatePersonalStory(){
 if(aiProfile.bossKills>=1&&!personalStory.flags.firstBoss){
   personalStory.flags.firstBoss=true;personalStory.chapter=2;storyPush('最初の大物を倒し、各地で名が知られ始めた');
 }
 if(aiProfile.uniqueKills>=1&&!personalStory.flags.firstUnique){
   personalStory.flags.firstUnique=true;personalStory.chapter=3;personalStory.faction='観測者';storyPush('ユニーク討伐をきっかけに、世界の裏側を知る者たちが接触してきた');
 }
 if(aiProfile.mined>=35&&!personalStory.flags.deepExplorer){
   personalStory.flags.deepExplorer=true;storyPush('採掘中、地底へ続く古代構造の痕跡を発見した');
 }
 if(aiProfile.built>=20&&!personalStory.flags.builder){
   personalStory.flags.builder=true;personalStory.faction='開拓同盟';storyPush('拠点が人を呼び、新しい集落の中心になり始めた');
 }
 if(state.lv>=12&&personalStory.chapter<4){
   personalStory.chapter=4;storyPush('禁足山岳のさらに奥から、世界級ボスの反応が観測された');
 }
}

const personalWorld={
  initialized:false,
  seed:Math.floor(Math.random()*999999),
  archetype:'unknown',
  worldTheme:'balanced',
  dangerBias:1,
  treasureBias:1,
  questBias:'combat',
  preferredRegion:null,
  uniqueTier:0,
  worldLevel:1,
  decisions:0,
  lastDecision:'未決定',
  unlockedZones:new Set(['plains']),
  aiQuests:[],
  history:[]
};

const originProfile={
  answers:[],
  completed:false,
  assignedJob:null,
  assignedWeapon:null,
  assignedTitle:null,
  assignedSkill:null
};

const ORIGIN_QUESTIONS=[
  {q:'強敵を見つけたら？',opts:[['正面から挑む','combat'],['様子を見る','tactical'],['別ルートを探す','explore']]},
  {q:'好きな戦い方は？',opts:[['高速回避','agile'],['防御と反撃','guard'],['大火力','power'],['遠距離','range'],['魔法','magic']]},
  {q:'冒険で一番好きなのは？',opts:[['ボス攻略','boss'],['探索','explore'],['収集・採掘','craft'],['未知の発見','unique']]},
  {q:'ピンチの時は？',opts:[['攻め続ける','risk'],['守る','guard'],['距離を取る','agile'],['アイテムを使う','support']]}
];

const UNIQUE_EVOLUTIONS={
  afterimage:{name:'残影の境地・極',desc:'ジャスト回避後3秒、移動速度+45%',requires:()=>aiProfile.perfectDodges>=30},
  sword_demon:{name:'剣鬼・修羅',desc:'片手剣コンボ上限+5、連撃補正強化',requires:()=>aiProfile.weaponUse.sword>=180},
  giant_breaker:{name:'星砕き・天断',desc:'部位破壊時に追加衝撃波',requires:()=>aiProfile.weaponUse.greatsword>=120},
  parry_master:{name:'刹那返し・零',desc:'パリィ成功時に必殺ゲージ+35%',requires:()=>aiProfile.parries>=30},
  pioneer:{name:'開拓王・創世',desc:'採掘素材2倍、建築消費50%軽減',requires:()=>aiProfile.mined>=80&&aiProfile.built>=40}
};
const evolvedUniqueSkills={};

function originScore(){
  const counts={};
  originProfile.answers.forEach(a=>counts[a]=(counts[a]||0)+1);
  return counts;
}

function assignOrigin(){
  if(originProfile.completed)return;
  const s=originScore();
  let job='冒険者', weapon='sword', titleName='目覚めし冒険者', skill='適応者';

  if((s.agile||0)+(s.explore||0)>=3){job='影走士';weapon='sword';titleName='風を読む者';skill='初動加速'}
  else if((s.guard||0)>=2){job='境界守護者';weapon='spear';titleName='不動の盾';skill='反撃本能'}
  else if((s.power||0)+(s.boss||0)>=3){job='破城闘士';weapon='greatsword';titleName='巨刃の挑戦者';skill='破砕衝動'}
  else if((s.magic||0)>=2){job='魔剣士';weapon='staff';titleName='魔脈の観測者';skill='魔力共鳴'}
  else if((s.range||0)>=2){job='狩人';weapon='bow';titleName='遠見の狩人';skill='弱点感知'}
  else if((s.craft||0)>=2){job='開拓者';weapon='spear';titleName='世界を拓く者';skill='素材眼'}

  originProfile.completed=true;
  originProfile.assignedJob=job;
  originProfile.assignedWeapon=weapon;
  originProfile.assignedTitle=titleName;
  originProfile.assignedSkill=skill;
  state.job=job;state.title=titleName;
  equipWeapon(weapon);
  personalWorld.archetype=job;
  personalWorld.initialized=true;
  pop('AI ORIGIN COMPLETE',`${job} / ${weapons[weapon]?.name||weapon}`);
  feed(`🧬 AI ORIGIN：${job} を付与`);
}

function answerOrigin(tag){
  if(originProfile.completed)return;
  originProfile.answers.push(tag);
  renderSaveSlots();renderSettings();renderBackend();
 renderOrigin();
  if(originProfile.answers.length>=ORIGIN_QUESTIONS.length)assignOrigin();
}

function renderOrigin(){
  const el=document.getElementById('originAIContent');
  if(!el)return;
  if(originProfile.completed){
    el.innerHTML=`<div class="row">職業：${originProfile.assignedJob}<br>初期武器：${weapons[originProfile.assignedWeapon]?.name||originProfile.assignedWeapon}<br>称号：${originProfile.assignedTitle}<br>初期パッシブ：${originProfile.assignedSkill}</div>`;
    return;
  }
  const i=originProfile.answers.length;
  const q=ORIGIN_QUESTIONS[i];
  if(!q){el.innerHTML='<div class="row">診断完了</div>';return}
  el.innerHTML=`<div class="row"><b>${i+1}/${ORIGIN_QUESTIONS.length} ${q.q}</b><br>${q.opts.map(([label,tag])=>`<button class="small" onclick="window.answerOrigin('${tag}')">${label}</button>`).join(' ')}</div>`;
}

function generateAIQuest(){
  const r=regionAt(player.position.x,player.position.z);
  const choices=[];
  if(aiProfile.totalKills<20)choices.push({type:'hunt',name:'AI討伐依頼',goal:5+Math.floor(personalWorld.worldLevel/2),region:r});
  if(aiProfile.mined<30)choices.push({type:'mine',name:'AI採掘依頼',goal:6+personalWorld.worldLevel,region:r});
  if(aiProfile.fished<10)choices.push({type:'fish',name:'AI釣り依頼',goal:3+Math.floor(personalWorld.worldLevel/3),region:r});
  choices.push({type:'boss',name:'AI強敵調査',goal:1,region:r});
  const q=choices[Math.floor(Math.random()*choices.length)];
  q.id='aiq_'+Date.now();
  q.start={kills:aiProfile.totalKills,mined:aiProfile.mined,fished:aiProfile.fished,boss:aiProfile.bossKills};
  q.done=false;
  q.rewardGold=150+personalWorld.worldLevel*80;
  q.rewardSp=1+(personalWorld.worldLevel>=5?1:0);
  personalWorld.aiQuests.unshift(q);
  personalWorld.aiQuests=personalWorld.aiQuests.slice(0,5);
  personalWorld.lastDecision='新AIクエスト生成：'+q.name;
  personalWorld.history.unshift(personalWorld.lastDecision);
  feed('📜 AIクエスト生成：'+q.name);
}


function updateObjective(){
  const el=document.getElementById('objectiveBox');if(!el)return;
  const active=personalWorld.aiQuests.find(q=>!q.done);
  if(active){
    el.textContent=`目的：${active.name} ${active.progress||0}/${active.goal}`;
    return;
  }
  if(nemesis.enemy?.alive){el.textContent=`目的：宿敵 ${nemesis.name} を撃破`;return}
  if(state.lv<5){el.textContent='目的：敵を倒してLv5を目指す';return}
  if(state.uniqueKills<1){el.textContent='目的：ユニークモンスターの条件を探す';return}
  el.textContent='目的：世界を探索し、さらなる強敵を探す';
}

function updateAIQuests(){
  for(const q of personalWorld.aiQuests){
    if(q.done)continue;
    let progress=0;
    if(q.type==='hunt')progress=aiProfile.totalKills-q.start.kills;
    if(q.type==='mine')progress=aiProfile.mined-q.start.mined;
    if(q.type==='fish')progress=aiProfile.fished-q.start.fished;
    if(q.type==='boss')progress=aiProfile.bossKills-q.start.boss;
    q.progress=Math.max(0,progress);
    if(q.progress>=q.goal){
      q.done=true;state.gold+=q.rewardGold;state.sp+=q.rewardSp;
      pop('AI QUEST CLEAR',q.name);
      feed(`📜 ${q.name} 達成：${q.rewardGold}G / SP+${q.rewardSp}`);
    }
  }
}

function evolveUniqueSkills(){
  for(const [baseId,evo] of Object.entries(UNIQUE_EVOLUTIONS)){
    if(uniqueSkills[baseId]&&!evolvedUniqueSkills[baseId]&&evo.requires()){
      evolvedUniqueSkills[baseId]={name:evo.name,desc:evo.desc,time:Date.now()};
      pop('UNIQUE SKILL EVOLUTION',evo.name);
      feed('🌟 ユニークスキル進化：'+evo.name);
    }
  }
}

function worldPersonalDecision(force=false){
  const now=performance.now();
  if(!force && now-(personalWorld._last||0)<12000)return;
  personalWorld._last=now;
  personalWorld.decisions++;

  const scores={
    combat:aiProfile.totalKills+aiProfile.bossKills*8,
    explore:aiProfile.uniqueKills*20+state.lv*2,
    craft:aiProfile.mined+aiProfile.built*2,
    agile:aiProfile.perfectDodges*3+aiProfile.parries*2
  };
  const dominant=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  personalWorld.questBias=dominant;

  if(dominant==='combat'){personalWorld.dangerBias=Math.min(1.6,personalWorld.dangerBias+.05);personalWorld.treasureBias=1.15;personalWorld.worldTheme='warzone'}
  if(dominant==='explore'){personalWorld.eventBias=1.4;personalWorld.treasureBias=1.3;personalWorld.worldTheme='mystery'}
  if(dominant==='craft'){personalWorld.dangerBias=.9;personalWorld.treasureBias=1.25;personalWorld.worldTheme='frontier'}
  if(dominant==='agile'){personalWorld.dangerBias=1.2;personalWorld.worldTheme='hunter'}

  personalWorld.worldLevel=Math.max(1,Math.floor((state.lv+aiProfile.bossKills*2+state.uniqueKills*3)/3));
  personalWorld.lastDecision=`${personalWorld.worldTheme} / Lv${personalWorld.worldLevel} / ${dominant}`;
  personalWorld.history.unshift(personalWorld.lastDecision);
  personalWorld.history=personalWorld.history.slice(0,12);

  if(Math.random()<.45||force)generateAIQuest();
  evolveUniqueSkills();

  if(aiProfile.uniqueKills>=1)personalWorld.unlockedZones.add('forest');
  if(aiProfile.bossKills>=2)personalWorld.unlockedZones.add('snow');
  if(state.lv>=8)personalWorld.unlockedZones.add('volcano');
  if(state.lv>=12||aiProfile.uniqueKills>=2)personalWorld.unlockedZones.add('mountain');

  feed('🌍 PERSONAL WORLD AI：'+personalWorld.lastDecision);
}

function renderWorldAI(){
  const el=document.getElementById('worldAIContent');
  if(!el)return;
  const quests=personalWorld.aiQuests.map(q=>`<div class="row">${q.done?'✅':'⏳'} ${q.name}<br>${q.type} ${q.progress||0}/${q.goal}<br>報酬 ${q.rewardGold}G / SP+${q.rewardSp}</div>`).join('');
  const evos=Object.values(evolvedUniqueSkills).map(s=>`<div class="row skillUnique">🌟 ${s.name}<br><span class="itemStat">${s.desc}</span></div>`).join('');
  el.innerHTML=`<div class="row">世界テーマ：${personalWorld.worldTheme}<br>世界Lv：${personalWorld.worldLevel}<br>AI決定回数：${personalWorld.decisions}<br>最終決定：${personalWorld.lastDecision}<br>解放地域：${[...personalWorld.unlockedZones].join(', ')}</div>${quests||'<div class="row">AIクエスト生成待ち</div>'}${evos}`;
}

const menuToggle=document.getElementById('menuToggle');
const menuEl=document.getElementById('menu');
menuToggle.addEventListener('click',()=>{
  menuEl.classList.toggle('open');
  menuToggle.textContent=menuEl.classList.contains('open')?'×':'☰';
});
document.getElementById('mineMenuBtn')?.addEventListener('click',()=>{mine();menuEl.classList.remove('open');menuToggle.textContent='☰'});
document.getElementById('buildMenuBtn')?.addEventListener('click',()=>{build();menuEl.classList.remove('open');menuToggle.textContent='☰'});

let aiStatusVisible=false;
menuToggle.addEventListener('dblclick',()=>{
  aiStatusVisible=!aiStatusVisible;
  document.getElementById('liveAIStatus').style.display=aiStatusVisible?'block':'none';
});

setTimeout(()=>{
  const h=document.getElementById('facingHelp');
  if(h)h.style.display='none';
},5000);


const SETTINGS={master:.7,sfx:.8,music:.25,quality:'auto',cameraSensitivity:1};

const PERF={
  fps:60,frames:0,last:performance.now(),lowFpsTime:0,highFpsTime:0,autoReduced:false,
  tick(){
    this.frames++;
    const now=performance.now(),elapsed=now-this.last;
    if(elapsed>=1000){
      this.fps=Math.round(this.frames*1000/elapsed);
      this.frames=0;this.last=now;
      const el=document.getElementById('perfChip');if(el)el.textContent=`FPS ${this.fps}${this.autoReduced?' / AUTO LOW':''}`;
      if(SETTINGS.quality==='auto'){
        if(this.fps<38){this.lowFpsTime++;this.highFpsTime=0}else if(this.fps>52){this.highFpsTime++;this.lowFpsTime=Math.max(0,this.lowFpsTime-1)}
        if(this.lowFpsTime>=3&&!this.autoReduced){
          this.autoReduced=true;renderer.setPixelRatio(1);sun.shadow.mapSize.set(512,512);
          feed('⚙️ 自動最適化：画質を軽量化');
        }
        if(this.highFpsTime>=8&&this.autoReduced){
          this.autoReduced=false;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
          feed('⚙️ 自動最適化：画質を復帰');
        }
      }
    }
  }
};

const BACKEND={url:'',connected:false,last:'未接続'};

const CHECKPOINT={name:'王都',x:4,y:3,z:-2,lastSaved:0};
function setCheckpoint(name,x,z){
  CHECKPOINT.name=name;CHECKPOINT.x=x;CHECKPOINT.z=z;CHECKPOINT.y=heightAt(Math.max(-32,Math.min(32,Math.round(x))),Math.max(-32,Math.min(32,Math.round(z))))+2;
  document.getElementById('checkpointChip').textContent='📍 '+name;
  feed('📍 チェックポイント登録：'+name);
}
function respawnAtCheckpoint(){
  player.position.set(CHECKPOINT.x,CHECKPOINT.y,CHECKPOINT.z);
  state.hp=state.maxHp;state.mp=Math.max(20,state.maxMp*.6);state.st=state.maxSt;
  msg('✨ '+CHECKPOINT.name+' から再開');
}



function autosave(){
  try{
    localStorage.setItem('yuusha_v18_autosave',JSON.stringify(snapshotGame()));
    CHECKPOINT.lastSaved=Date.now();
    const c=document.getElementById('checkpointChip');if(c)c.textContent='📍 '+CHECKPOINT.name+' / AUTO';
  }catch(e){SELF_HEAL.record('autosave',e)}
}
setInterval(()=>{if(document.visibilityState==='visible')autosave()},30000);
addEventListener('pagehide',()=>autosave());

function snapshotGame(){
 return {
  state,mats,inventory,quests,kills,mined,fished,weaponKey,skillState,jobKey,equippedSet,baseCamp,adaptiveAI,
  discoveredItems:[...discoveredItems],ownedCounts,forgeLevels,aiProfile,uniqueSkills,liveAI,evolvedJob,
  personalWorld:{...personalWorld,unlockedZones:[...personalWorld.unlockedZones]},originProfile,evolvedUniqueSkills,
  personalStory,nemesis:{...nemesis,enemy:null},settings:SETTINGS,checkpoint:CHECKPOINT,
  pos:{x:player.position.x,y:player.position.y,z:player.position.z},
  enemies:enemies.map(e=>({hp:e.hp,alive:e.alive,phase:e.phase,name:e.name}))
 };
}
function saveSlot(n){
 try{localStorage.setItem('yuusha_v17_slot_'+n,JSON.stringify(snapshotGame()));msg(`💾 スロット${n}に保存`);refreshMenus()}catch(e){SELF_HEAL.record('save-slot',e)}
}
function loadSlot(n){
 const raw=localStorage.getItem('yuusha_v17_slot_'+n);if(!raw)return msg('セーブなし');
 try{localStorage.setItem('yuusha_v14_stable',raw);window.loadGame();msg(`📂 スロット${n}を読込`)}catch(e){SELF_HEAL.record('load-slot',e)}
}
function renderSaveSlots(){
 const el=document.getElementById('saveSlotsContent');if(!el)return;
 el.innerHTML=[1,2,3].map(n=>{const has=!!localStorage.getItem('yuusha_v17_slot_'+n);return `<div class="row">スロット${n} ${has?'✅':'空'} <button onclick="window.saveSlot(${n})">保存</button> <button onclick="window.loadSlot(${n})">読込</button></div>`}).join('');
}
function renderSettings(){
 const el=document.getElementById('settingsContent');if(!el)return;
 el.innerHTML=`<div class="row">
 <label>音量 <input type="range" min="0" max="1" step=".05" value="${SETTINGS.master}" oninput="window.setSetting('master',this.value)"></label>
 <label>効果音 <input type="range" min="0" max="1" step=".05" value="${SETTINGS.sfx}" oninput="window.setSetting('sfx',this.value)"></label>
 <label>カメラ感度 <input type="range" min=".5" max="1.8" step=".1" value="${SETTINGS.cameraSensitivity}" oninput="window.setSetting('cameraSensitivity',this.value)"></label>
 <label>画質 <button class="small" onclick="window.cycleQuality()">${SETTINGS.quality}</button></label>
 </div>`;
}
function setSetting(k,v){SETTINGS[k]=Number(v);AUDIO.master=SETTINGS.master;AUDIO.sfx=SETTINGS.sfx;localStorage.setItem('yuusha_v17_settings',JSON.stringify(SETTINGS))}
function cycleQuality(){SETTINGS.quality=SETTINGS.quality==='auto'?'low':SETTINGS.quality==='low'?'high':'auto';applyQuality();renderSettings()}
function applyQuality(){
 const low=SETTINGS.quality==='low'||(SETTINGS.quality==='auto'&&devicePixelRatio>2);
 renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.7));
 sun.shadow.mapSize.set(low?512:1024,low?512:1024);
}
function renderBackend(){
 const el=document.getElementById('backendContent');if(!el)return;
 el.innerHTML=`<div class="row"><b>安全な接続方式</b><br>APIキーをHTMLへ直接入れず、あなたのサーバーを経由して生成AIへ接続します。AIはJSON設定のみ返し、ゲームコード自体は書き換えません。</div>
 <div class="row">Backend URL<br><input id="backendUrlInput" style="width:100%" placeholder="https://your-server.example/api/game-master" value="${BACKEND.url||''}">
 <button class="small" onclick="window.setBackend()">保存</button><button class="small" onclick="window.testBackend()">接続テスト</button></div>
 <div id="backendStatus" class="row">状態：${BACKEND.last}</div>`;
}
function setBackend(){BACKEND.url=document.getElementById('backendUrlInput')?.value.trim()||'';localStorage.setItem('yuusha_v17_backend',BACKEND.url);renderBackend()}
async function testBackend(){
 if(!BACKEND.url){BACKEND.last='URL未設定';renderBackend();return}
 try{
  const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),3500);
  const r=await fetch(BACKEND.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'health',game:'yuusha-v17'}),signal:ctrl.signal});
  BACKEND.connected=r.ok;BACKEND.last=r.ok?'接続成功':'HTTP '+r.status;
 }catch(e){BACKEND.connected=false;BACKEND.last='接続失敗: '+e.message}
 renderBackend();
}
window.saveSlot=saveSlot;window.loadSlot=loadSlot;window.setSetting=setSetting;window.cycleQuality=cycleQuality;window.setBackend=setBackend;window.testBackend=testBackend;
try{Object.assign(SETTINGS,JSON.parse(localStorage.getItem('yuusha_v17_settings')||'{}'))}catch(_){}
BACKEND.url=localStorage.getItem('yuusha_v17_backend')||'';
AUDIO.master=SETTINGS.master;AUDIO.sfx=SETTINGS.sfx;

window.answerOrigin=answerOrigin;
window.forceWorldDecision=()=>{worldPersonalDecision(true);renderWorldAI();refreshMenus()};


function baseCampBuild(){
 const y=heightAt(baseCamp.x,baseCamp.z)+1;
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   if(Math.abs(dx)===2||Math.abs(dz)===2) addBlock(baseCamp.x+dx,y,baseCamp.z+dz,'wood');
 }
 addBlock(baseCamp.x,y+1,baseCamp.z,'stone');
}
baseCampBuild();

function spawnWorldEvent(){
 if(worldEvent.active)return;
 const types=['meteor','horde','treasure'];
 worldEvent.type=types[Math.floor(Math.random()*types.length)];
 worldEvent.active=true;worldEvent.time=45;
 const b=document.getElementById('eventBanner');
 b.style.display='block';
 b.textContent=worldEvent.type==='meteor'?'☄️ ワールドイベント：隕石落下！ クリスタルを探せ':
              worldEvent.type==='horde'?'👹 ワールドイベント：魔物大発生！':
              '💰 ワールドイベント：黄金宝箱が出現！';
 setTimeout(()=>b.style.display='none',5000);
 feed('🌐 ワールドイベント発生：'+worldEvent.type);
 if(worldEvent.type==='horde'){
   for(let i=0;i<8;i++) enemy(i%2?'wolf':'orc',player.position.x+Math.random()*14-7,player.position.z+Math.random()*14-7);
 }
 if(worldEvent.type==='meteor'){
   const x=Math.round(player.position.x+8),z=Math.round(player.position.z+6),y=heightAt(x,z)+1;
   const m=addBlock(x,y,z,'stone');m.material=mat(0x6fe6ff,.25,.2);m.userData.type='crystal';
 }
}

const player=new THREE.Group();
function humanoid(color=0x3f79d6,scale=1){
 const g=new THREE.Group();
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.7,1.1,.4),mat(color,.6));torso.position.y=1.45;torso.castShadow=true;
 const head=new THREE.Mesh(new THREE.BoxGeometry(.55,.55,.55),mat(0xdcae86,.7));head.position.y=2.28;head.castShadow=true;
 const legG=new THREE.BoxGeometry(.24,.85,.26),armG=new THREE.BoxGeometry(.2,.85,.22);
 const ll=new THREE.Mesh(legG,mat(0x26384f)),rl=ll.clone(),la=new THREE.Mesh(armG,mat(color,.6)),ra=la.clone();
 ll.position.set(-.2,.55,0);rl.position.set(.2,.55,0);la.position.set(-.5,1.45,0);ra.position.set(.5,1.45,0);
 g.add(torso,head,ll,rl,la,ra);g.userData={ll,rl,la,ra,walk:0};g.scale.setScalar(scale);return g;
}
const hero=humanoid(0x3f79d6,1);player.add(hero);

// ===== Facing indicator =====
const facingRoot=new THREE.Group();
const arrowShape=new THREE.Shape();
arrowShape.moveTo(0,0.85);
arrowShape.lineTo(-0.34,0.18);
arrowShape.lineTo(-0.13,0.18);
arrowShape.lineTo(-0.13,-0.55);
arrowShape.lineTo(0.13,-0.55);
arrowShape.lineTo(0.13,0.18);
arrowShape.lineTo(0.34,0.18);
arrowShape.closePath();

const arrowGeo=new THREE.ShapeGeometry(arrowShape);
const arrowMat=new THREE.MeshBasicMaterial({
  color:0x69d6ff,
  transparent:true,
  opacity:.9,
  side:THREE.DoubleSide,
  depthWrite:false
});
const facingArrow=new THREE.Mesh(arrowGeo,arrowMat);
facingArrow.rotation.x=-Math.PI/2;
facingArrow.rotation.z=Math.PI;
facingArrow.position.set(0,.055,-1.15);
facingArrow.scale.set(.85,.85,.85);
facingRoot.add(facingArrow);

// Front glow orb
const frontGlow=new THREE.Mesh(
  new THREE.SphereGeometry(.11,12,8),
  new THREE.MeshBasicMaterial({color:0xbff3ff,transparent:true,opacity:.95})
);
frontGlow.position.set(0,.35,-1.0);
facingRoot.add(frontGlow);

// Subtle ring under player
const ring=new THREE.Mesh(
  new THREE.RingGeometry(.62,.72,32),
  new THREE.MeshBasicMaterial({color:0x4ba9ff,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false})
);
ring.rotation.x=-Math.PI/2;
ring.position.y=.035;
facingRoot.add(ring);

player.add(facingRoot);

const weaponPivot=new THREE.Group();weaponPivot.position.set(.7,1.7,0);player.add(weaponPivot);scene.add(player);

const weaponModels={};
function makeSword(){const g=new THREE.Group(),b=new THREE.Mesh(new THREE.BoxGeometry(.1,1.7,.08),mat(0xf2f6fb,.12,1));b.position.y=-.75;g.add(b);return g}
function makeGreatSword(){const g=new THREE.Group(),b=new THREE.Mesh(new THREE.BoxGeometry(.22,2.2,.12),mat(0xd7dde4,.18,.9));b.position.y=-1;g.add(b);return g}
function makeSpear(){const g=new THREE.Group(),p=new THREE.Mesh(new THREE.BoxGeometry(.08,2.6,.08),mat(0x76532f,.8));p.position.y=-1.15;const tip=new THREE.Mesh(new THREE.ConeGeometry(.18,.55,6),mat(0xe5edf3,.18,1));tip.position.y=-2.55;tip.rotation.z=Math.PI;g.add(p,tip);return g}
function makeBow(){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.TorusGeometry(.8,.06,6,24,Math.PI),mat(0x8a5a2c,.7));b.rotation.z=Math.PI/2;g.add(b);return g}
function makeStaff(){const g=new THREE.Group();const p=new THREE.Mesh(new THREE.BoxGeometry(.09,2.1,.09),mat(0x6e4d2f,.75));p.position.y=-.9;const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.24),new THREE.MeshStandardMaterial({color:0x7fd4ff,emissive:0x245a7a,emissiveIntensity:1.5}));gem.position.y=-2;g.add(p,gem);return g}
weaponModels.sword=makeSword();weaponModels.greatsword=makeGreatSword();weaponModels.spear=makeSpear();weaponModels.bow=makeBow();weaponModels.staff=makeStaff();

const weapons={
 sword:{name:'片手剣',atk:32,st:7,range:2.8,skill:'旋風斬り'},
 greatsword:{name:'大剣',atk:50,st:15,range:3.4,skill:'地裂斬'},
 spear:{name:'槍',atk:38,st:9,range:4.2,skill:'貫通突き'},
 bow:{name:'弓',atk:28,st:8,range:10,skill:'三連射'},
 staff:{name:'魔導杖',atk:24,st:5,range:9,skill:'爆炎魔法'}
};
let weaponKey='sword';
function equipWeapon(k){
 weaponKey=k;while(weaponPivot.children.length)weaponPivot.remove(weaponPivot.children[0]);
 const model=weaponModels[k];
 if(model) weaponPivot.add(model);
 if(bootReady){
   msg(`⚔️ ${weapons[k].name}を装備`);
   refreshMenus();
 }
}


const state={hp:200,maxHp:200,mp:80,maxMp:80,st:110,maxSt:110,lv:1,xp:0,gold:250,sp:0,burst:0,atkBonus:0,title:'駆け出しの冒険者',parries:0,dodges:0,uniqueKills:0,
job:'冒険者',jobLv:1,ngPlus:0,dungeonFloor:1,bossRushBest:0,element:'neutral',status:null,statusTime:0,baseLevel:1};
const mats={stone:0,wood:0,iron:0,herb:0,fish:0,magic:0,blocks:20,crystal:0,bossCore:0};
let inventory=[],quests={hunt:{done:false},mine:{done:false},fish:{done:false},unique:{done:false}};
// Critical equipment state is initialized early to avoid TDZ/startup errors.
let equippedSet={weapon:null,armor:null,accessory:null};
let bootReady=false;
let kills=0,mined=0,fished=0,combo=0,comboTimer=0,attackCD=0,skillCD=0,dodgeTime=0,parry=0,guard=false,worldTime=480,weather='clear',weatherT=25;
let joy={x:0,y:0},targetYaw=0,currentYaw=0,targetPitch=.42,currentPitch=.42;

const liveAI={
  enabled:true,
  tick:0,
  lastDecision:0,
  mood:'balanced',
  difficulty:1.0,
  encounterRate:1.0,
  dropBias:1.0,
  eventBias:1.0,
  mercy:0,
  pressure:0,
  explorationBias:0,
  combatBias:0,
  buildingBias:0,
  generation:0,
  lastEvent:'なし',
  history:[]
};


const nemesis={
 active:false,
 id:'nemesis',
 name:'未命名の宿敵',
 rank:1,
 defeats:0,
 escapes:0,
 memory:{dodges:0,parries:0,weapon:null},
 enemy:null,
 lastSpawn:0
};

function createNemesis(){
 if(nemesis.enemy&&nemesis.enemy.alive)return;
 const type=aiProfile.weaponUse.greatsword>aiProfile.weaponUse.sword?'orc':'wolf';
 const e=enemy(type,player.position.x+10,player.position.z+8,true,true);
 e.name=nemesis.name==='未命名の宿敵'?['灰牙','黒鉄','赫眼','夜爪'][Math.floor(Math.random()*4)]+'・'+['ヴァル','レオン','ノクス','グラム'][Math.floor(Math.random()*4)]:nemesis.name;
 e.nemesis=true;
 e.hp=Math.floor(e.maxHp*(1+nemesis.rank*.35));e.maxHp=e.hp;
 e.atk=Math.floor(e.atk*(1+nemesis.rank*.18));
 e.speed*=1+nemesis.rank*.05;
 nemesis.name=e.name;nemesis.enemy=e;nemesis.active=true;nemesis.lastSpawn=performance.now();
 const c=document.getElementById('nemesisCard');
 c.innerHTML=`<b>⚔️ NEMESIS APPEARED</b><br>${e.name}<br>Rank ${nemesis.rank}<br><small>あなたの戦い方を学習しています</small>`;
 c.style.display='block';setTimeout(()=>c.style.display='none',2600);
 feed('🧠 宿敵AI：'+e.name+' が再出現');
}
function updateNemesisMemory(){
 nemesis.memory.dodges=aiProfile.perfectDodges;
 nemesis.memory.parries=aiProfile.parries;
 nemesis.memory.weapon=weaponKey;
}
function maybeSpawnNemesis(){
 if(nemesis.enemy?.alive)return;
 if(aiProfile.totalKills>=8 && performance.now()-nemesis.lastSpawn>45000 && Math.random()<.0025){
   createNemesis();
 }
}


const projectiles=[];
function spawnProjectile(e,count=1,spread=.18,speed=8){
  for(let i=0;i<count;i++){
    const geo=new THREE.SphereGeometry(.16+(e.boss?.08:0),8,6);
    const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:e.type==='ice'?0x8fd7ff:e.type==='fire'?0xff6a33:0xb36dff}));
    mesh.position.copy(e.obj.position).add(new THREE.Vector3(0,e.size*1.2,0));
    scene.add(mesh);
    const base=player.position.clone().sub(mesh.position);base.y=0;base.normalize();
    const ang=(i-(count-1)/2)*spread;
    base.applyAxisAngle(new THREE.Vector3(0,1,0),ang);
    projectiles.push({mesh,vel:base.multiplyScalar(speed),life:4,damage:Math.floor(e.atk*.7),owner:e});
  }
}
function updateProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);
    if(dist(player.position,p.mesh.position)<.7){
      if(dodgeTime>0){msg('✨ 飛び道具ジャスト回避');state.burst=Math.min(100,state.burst+8)}
      else if(parry>0){AUDIO.parry();msg('⚡ 飛び道具パリィ');state.burst=Math.min(100,state.burst+12)}
      else{const dm=Math.max(1,Math.floor(p.damage*liveAI.difficulty));state.hp-=dm;animateHitModel();damageNumber(player.position.clone().add(new THREE.Vector3(0,2.5,0)),dm,false,'HIT')}
      scene.remove(p.mesh);projectiles.splice(i,1);continue;
    }
    if(p.life<=0){scene.remove(p.mesh);projectiles.splice(i,1)}
  }
}
function bossPattern(e){
  if(!e.boss)return;
  const tel=document.getElementById('bossTelegraph');
  const r=Math.random();
  if(e.phase===1&&r<.45){tel.textContent='⚠️ 直線弾';tel.style.display='block';setTimeout(()=>{tel.style.display='none';spawnProjectile(e,1,.1,8)},420)}
  else if(e.phase>=2&&r<.7){tel.textContent='⚠️ 扇状弾';tel.style.display='block';setTimeout(()=>{tel.style.display='none';spawnProjectile(e,e.phase===3?7:5,.17,e.phase===3?10:8.5)},420)}
  else if(e.phase===3){tel.textContent='⚠️ 高速連射';tel.style.display='block';setTimeout(()=>{tel.style.display='none';spawnProjectile(e,3,.08,11)},260)}
}

const enemies=[];
function enemy(type,x,z,boss=false,unique=false){
 const D={
 slime:['スライム',0x66d65a,60,9,2.0,.7,18,15],wolf:['影狼',0x404752,110,15,3.1,.8,32,24],orc:['オーク',0x7e5339,170,21,2.3,1,48,38],
 fire:['炎獄王ヴァルガ',0xdf5a2e,900,32,2.5,1.7,260,550],ice:['氷帝フェンリル',0x76b6ef,1450,38,3.0,2,380,850],
 abyss:['深淵王アビス',0x7544a5,2500,50,2.7,2.5,780,1900],unique:['月蝕獣ネブラ',0x251c36,1900,44,3.4,2.2,600,1400]
 }[type];
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(D[5]*1.4,D[5]*1.4,D[5]*1.4),mat(D[1],.65));
 body.position.y=D[5]*.75;body.castShadow=true;g.add(body);g.position.set(x,heightAt(Math.round(x),Math.round(z))+1,z);scene.add(g);
 const scaledHP=Math.floor(D[2]*(boss?liveAI.difficulty:Math.max(.85,liveAI.difficulty*.92)));
 const e={type,name:D[0],obj:g,hp:scaledHP,maxHp:scaledHP,atk:D[3],speed:D[4],size:D[5],xp:D[6],gold:D[7],boss,unique,alive:true,wind:0,cd:0,phase:1,parts:{core:100,armor:100}};
 enemies.push(e);return e;
}
for(let i=0;i<30;i++){const x=Math.random()*50-25,z=Math.random()*50-25;enemy(i%6===0?'orc':i%2?'wolf':'slime',x,z)}
enemy('fire',22,-20,true);enemy('ice',-22,22,true);enemy('abyss',25,24,true);const uniqueBoss=enemy('unique',-28,-25,true,true);uniqueBoss.alive=false;uniqueBoss.obj.visible=false;

const uniqueStorm=enemy('ice',28,-28,true,true);uniqueStorm.name='雷雪獣ヴォルテクス';uniqueStorm.hp=2100;uniqueStorm.maxHp=2100;uniqueStorm.alive=false;uniqueStorm.obj.visible=false;
const uniqueForge=enemy('fire',-27,27,true,true);uniqueForge.name='溶鉄巨人グラド';uniqueForge.hp=2300;uniqueForge.maxHp=2300;uniqueForge.alive=false;uniqueForge.obj.visible=false;
const uniqueWarden=enemy('abyss',30,30,true,true);uniqueWarden.name='境界監視者ノクス';uniqueWarden.hp=2800;uniqueWarden.maxHp=2800;uniqueWarden.alive=false;uniqueWarden.obj.visible=false;


const allies=[];
['🛡️','🧙','✨'].forEach((_,i)=>{const g=humanoid([0x6688cc,0xaa66cc,0x66bb88][i],.8);scene.add(g);allies.push({obj:g,role:['tank','mage','heal'][i],cd:0})});

const fakePlayers=[];
for(let i=0;i<8;i++){const g=humanoid([0x55aaff,0xdd6699,0x77cc88,0xd6aa55][i%4],.72);scene.add(g);fakePlayers.push({obj:g,a:Math.random()*6.28,name:['Raven','Mio','Kite','Noa','Zen','Luna','Ash','Rin'][i]})}

const raycaster=new THREE.Raycaster(),center=new THREE.Vector2(0,0);
const logEl=document.getElementById('log'),feedEl=document.getElementById('worldFeed'),notice=document.getElementById('notice');
const bossBox=document.getElementById('boss'),bossName=document.getElementById('bossName'),bossBar=document.getElementById('bossBar');
const mini=document.getElementById('mini'),mctx=mini.getContext('2d');

let logHideTimer=null;

const damageLayer=document.getElementById('damageLayer');

const AUDIO={
  ctx:null, master:.7, music:.25, sfx:.8, enabled:true, ambientTimer:0,
  init(){
    if(this.ctx||!this.enabled)return;
    try{this.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(_){}
  },
  tone(freq=440,dur=.08,type='sine',gain=.08){
    if(!this.enabled)return;
    this.init(); if(!this.ctx)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=gain*this.sfx*this.master;
    o.connect(g);g.connect(this.ctx.destination);o.start();
    g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+dur);
    o.stop(this.ctx.currentTime+dur);
  },
  hit(crit=false){this.tone(crit?170:220,.07,'square',crit?.11:.07)},
  dodge(){this.tone(520,.09,'sine',.06)},
  parry(){this.tone(880,.11,'triangle',.09);setTimeout(()=>this.tone(1180,.08,'triangle',.06),35)},
  ui(){this.tone(660,.04,'sine',.035)},
  boss(){this.tone(110,.25,'sawtooth',.07);setTimeout(()=>this.tone(82,.3,'sawtooth',.08),120)}
};
addEventListener('pointerdown',()=>AUDIO.init(),{once:true});

let cameraShake=0,hitStop=0;
function worldToScreen(pos){
 const p=pos.clone();p.project(camera);
 return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,visible:p.z<1};
}
function damageNumber(pos,val,crit=false,label=''){
 const s=worldToScreen(pos);
 if(!s.visible)return;
 const d=document.createElement('div');
 d.className='dmgNum';
 d.textContent=(label?label+' ':'')+Math.floor(val);
 d.style.left=s.x+'px';d.style.top=s.y+'px';
 d.style.fontSize=(crit?23:18)+'px';
 damageLayer.appendChild(d);
 setTimeout(()=>d.remove(),750);
}
function doHitStop(ms=55){hitStop=Math.max(hitStop,ms/1000)}
function shakeCamera(amount=.16){cameraShake=Math.max(cameraShake,amount)}

function msg(t){
 logEl.textContent=t;
 logEl.classList.remove('quiet');
 clearTimeout(logHideTimer);
 logHideTimer=setTimeout(()=>logEl.classList.add('quiet'),2600);
}

const SELF_HEAL={
 disabled:new Set(),errors:[],
 record(system,e){const row={time:new Date().toISOString(),system,message:String(e?.message||e)};this.errors.unshift(row);this.errors=this.errors.slice(0,50);try{localStorage.setItem('yuusha_v14_runtime_errors',JSON.stringify(this.errors));window.__SELF_HEAL?.record?.(system+': '+row.message)}catch(_){};try{feed('🛠️ SELF HEAL：'+system+' を隔離')}catch(_){}},
 run(system,fn,fallback){if(this.disabled.has(system))return fallback;try{return fn()}catch(e){this.record(system,e);this.disabled.add(system);return fallback}},
 reset(){this.disabled.clear();try{feed('🛠️ 隔離サブシステムを再起動')}catch(_){}}
};
window.SELF_HEAL=SELF_HEAL;
// Initial weapon setup is deferred until all game data is initialized.
function feed(t){const d=document.createElement('div');d.className='feed';d.textContent=t;feedEl.prepend(d);while(feedEl.children.length>3)feedEl.lastChild.remove()}
function pop(t,s=''){notice.innerHTML=`<strong>${t}</strong><div>${s}</div>`;notice.style.display='block';setTimeout(()=>notice.style.display='none',2400)}
function title(t){state.title=t;document.getElementById('titleBadge').textContent='称号：'+t;feed('🏷️ 称号「'+t+'」獲得')}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function nearest(r=4){let b=null,d0=1e9;for(const e of enemies){if(!e.alive)continue;let d=dist(player.position,e.obj.position);if(d<r&&d<d0){b=e;d0=d}}return b}
function kill(e){
 if(e.nemesis){
   nemesis.defeats++;
   nemesis.rank++;
   nemesis.active=false;
   nemesis.enemy=null;
   updateNemesisMemory();
   pop('NEMESIS DEFEATED',`${e.name} はさらに強くなって戻ってくる…`);
   feed('🧠 宿敵AI：戦闘データを学習');
 }

 e.alive=false;e.obj.visible=false;state.gold+=e.gold;state.xp+=e.xp;kills++;
 aiProfile.totalKills++;
 if(e.boss)aiProfile.bossKills++;
 if(e.boss&&state.hp<state.maxHp*.25)aiProfile.lowHpBossKills++;
 if(e.unique){aiProfile.uniqueKills++}
 if(state.hp>=state.maxHp*.98)aiProfile.noDamageKills++;
 if(e.unique){state.uniqueKills++;pop('UNIQUE MONSTER DEFEATED',e.name);feed('🌐 ワールドログ：'+e.name+'討伐');title('ユニークハンター')}
 if(Math.random()<Math.min(.9,.48*liveAI.dropBias)){
   const normalPool=ITEM_DB.filter(i=>['weapon','armor','accessory','consumable'].includes(i.slot)&&!i.boss);
   const base=normalPool[Math.floor(Math.random()*normalPool.length)];
   const drop=itemRoll(base);inventory.push(drop);discoveredItems.add(base.id);ownedCounts[base.id]=(ownedCounts[base.id]||0)+1;
   pop('🎁 DROP',base.name+' ['+base.rar+']');
 }
 if(e.boss){
   state.sp+=2;mats.bossCore++;feed('🌐 BOSS撃破：'+e.name);
   if(e.type==='fire'){giveItem('gs04');giveItem('ma05')}
   if(e.type==='ice'){giveItem('sp04');giveItem('ar06');giveItem('ma06')}
   if(e.type==='abyss'){giveItem('st04');giveItem('ar08');giveItem('ma07')}
   if(e.unique){giveItem('sw06');giveItem('ac05');giveItem('ma08')}
 }
 if(state.xp>=state.lv*100){state.xp-=state.lv*100;state.lv++;state.maxHp+=22;state.hp=state.maxHp;state.sp++;pop('LEVEL UP','Lv.'+state.lv)}
 if(!quests.hunt.done&&kills>=5){quests.hunt.done=true;state.gold+=300;state.sp++;feed('📜 討伐クエスト達成')}
}
function damage(e,d){e.hp-=d;if(e.hp<=e.maxHp*.66&&e.phase===1&&e.boss){e.phase=2;e.atk+=7;e.speed*=1.18;AUDIO.boss();pop('PHASE 2',e.name)}
 if(e.hp<=e.maxHp*.30&&e.phase===2&&e.boss){e.phase=3;e.atk+=10;e.speed*=1.18;AUDIO.boss();pop('FINAL PHASE',e.name)}if(e.hp<=0)kill(e)}

function attack(){
 adaptiveAI.attacks++;aiProfile.attacks++;aiProfile.weaponUse[weaponKey]=(aiProfile.weaponUse[weaponKey]||0)+1;
 if(attackCD>0)return;
 const w=weapons[weaponKey];if(state.st<w.st)return;
 state.st-=w.st;attackCD=.28;
 let maxCombo=hasUSkill('sword_demon')&&weaponKey==='sword'?11:8;
 combo=Math.min(maxCombo,combo+1);comboTimer=1.15;
 const e=nearest(w.range);
 if(!e){msg('⚔️ 空振り');weaponPivot.rotation.x=-.8;setTimeout(()=>weaponPivot.rotation.x=0,100);return}
 let mult=1+(combo-1)*.12;
 if(hasUSkill('sword_demon')&&weaponKey==='sword')mult*=1.12;
 if(combo===3)mult*=1.18;
 if(combo>=5)mult*=1.24;
 let critChance=.12+(hasUSkill('untouched')?.15:0);
 let crit=Math.random()<critChance;
 let critMul=crit?1.8:1;
 let uniqueAtkMult=(hasUSkill('last_stand')&&state.hp<state.maxHp*.25)?1.35:1;
 let dmg=Math.floor((w.atk+state.atkBonus+state.lv*3)*mult*critMul*jobs[jobKey].atk*uniqueAtkMult);
 if(weaponKey==='greatsword'){
   e.parts.armor-=hasUSkill('giant_breaker')?27:18;
   if(e.parts.armor<=0){e.parts.armor=999;dmg=Math.floor(dmg*1.7);msg('💥 部位破壊！')}
 }
 damage(e,dmg);
 damageNumber(e.obj.position.clone().add(new THREE.Vector3(0,e.size*1.8,0)),dmg,crit,crit?'CRIT':'');
 doHitStop(crit?85:55);shakeCamera(crit?.23:.14);AUDIO.hit(crit);animateAttackModel(crit?1.4:1);
 state.burst=Math.min(100,state.burst+9);
 msg(`⚔️ ${combo}連撃 ${dmg}ダメージ`);
 weaponPivot.rotation.x=-1.25;weaponPivot.rotation.z=-.35;
 setTimeout(()=>{weaponPivot.rotation.x=0;weaponPivot.rotation.z=0},135);
}
function skill(){aiProfile.skills++;aiProfile.weaponUse[weaponKey]=(aiProfile.weaponUse[weaponKey]||0)+1;
 let skillCost=(hasUSkill('arcane_flow')&&weaponKey==='staff')?10:12;if(skillCD>0||state.mp<skillCost)return;state.mp-=skillCost;skillCD=1.5;let hit=0,w=weapons[weaponKey];
 for(const e of enemies)if(e.alive&&dist(player.position,e.obj.position)<(weaponKey==='bow'||weaponKey==='staff'?10:5)){{const sd=(w.atk+45+state.lv*6)*jobs[jobKey].mp*(hasUSkill('arcane_flow')&&weaponKey==='staff'?1.18:1);damage(e,sd);damageNumber(e.obj.position.clone().add(new THREE.Vector3(0,e.size*1.8,0)),sd,false,'SKILL');hit++}}
 shakeCamera(.18);doHitStop(65);msg(`🔥 ${w.skill}！ ${hit}体命中`);
}
function dodge(){if(state.st<20)return;adaptiveAI.dodges++;aiProfile.dodges++;animateDodgeModel();AUDIO.dodge();state.st-=20;dodgeTime=.6;state.dodges++;msg('💨 回避')}
function guardFn(){guard=true;parry=.2;setTimeout(()=>guard=false,450);msg('🛡️ ガード / パリィ受付')}
function heal(){if(state.mp<10)return;state.mp-=10;state.hp=Math.min(state.maxHp,state.hp+55);msg('✨ 回復')}
function burst(){if(state.burst<100)return;state.burst=0;for(const e of enemies)if(e.alive&&dist(player.position,e.obj.position)<8)damage(e,180+state.lv*20);msg('⚡ 必殺「天翔断」')}

function mine(){
 raycaster.setFromCamera(center,camera);const hits=raycaster.intersectObjects([...blockMap.values()],false);const h=hits[0];if(!h||h.distance>6)return msg('⛏️ 採掘できるブロックが遠い');
 const b=h.object,t=b.userData.type;if(t==='water'||t==='lava')return;
 world.remove(b);blockMap.delete(key(Math.round(b.position.x),Math.round(b.position.y),Math.round(b.position.z)));
 if(t==='stone'){mats.stone+=(hasUSkill('pioneer')?2:1)*(liveAI.buildingBias>.6?2:1);if(Math.random()<.3)mats.iron+=(hasUSkill('pioneer')?2:1)}else if(t==='crystal'){mats.crystal+=2;feed('💎 クリスタルを採掘')}else if(t==='wood')mats.wood++;else mats.blocks++;
 mined++;aiProfile.mined++;msg(`⛏️ ${t}を採掘`);
 if(!quests.mine.done&&mined>=10){quests.mine.done=true;state.sp++;feed('📜 採掘クエスト達成')}
}
function build(){
 if(mats.blocks<=0)return msg('🧱 建築ブロックがない');
 raycaster.setFromCamera(center,camera);const hits=raycaster.intersectObjects([...blockMap.values()],false);const h=hits[0];if(!h||h.distance>7)return;
 const n=h.face.normal.clone(),p=h.object.position.clone().add(n);p.set(Math.round(p.x),Math.round(p.y),Math.round(p.z));
 if(blockMap.has(key(p.x,p.y,p.z)))return;addBlock(p.x,p.y,p.z,'stone');mats.blocks-=hasUSkill('pioneer')&&Math.random()<.5?0:1;aiProfile.built++;msg('🧱 ブロック設置');
}
function interact(){
 const npcHit=NPC_DIALOGS.find(n=>dist(player.position,n.obj.position)<3.1);
 if(npcHit){openNPCDialog(npcHit.obj);return}

 raycaster.setFromCamera(center,camera);
 const blockHits=raycaster.intersectObjects([...blockMap.values()],false);
 const bh=blockHits[0];
 if(bh&&bh.distance<5&&bh.object.userData?.chest&&!bh.object.userData.opened){
   bh.object.userData.opened=true;
   const roll=Math.random();
   if(roll<.5){state.gold+=150+state.lv*20;msg('💰 宝箱：ゴールド獲得')}
   else if(roll<.82){mats.crystal+=2;msg('💎 宝箱：クリスタル×2')}
   else{const pool=ITEM_DB.filter(i=>!i.boss&&['weapon','armor','accessory'].includes(i.slot));const it=pool[Math.floor(Math.random()*pool.length)];giveItem(it.id);msg('🎁 宝箱：'+it.name)}
   bh.object.material=mat(0x4b3526,1);
   return;
 }
 const lakeDist=dist(player.position,new THREE.Vector3(0,0,12));
 if(lakeDist<9){
   if(Math.random()<.6){mats.fish++;fished++;aiProfile.fished++;if(hasUSkill('fisher_sage')&&Math.random()<.22)mats.magic++;msg('🎣 魚を釣った！');if(fished>=3&&!quests.fish.done){quests.fish.done=true;state.gold+=150;feed('📜 釣りクエスト達成')}}
   else msg('🎣 逃げられた');return
 }
 const nearWarp=warpPoints.find(w=>Math.hypot(player.position.x-w.x,player.position.z-w.z)<3);
 if(nearWarp){setCheckpoint(nearWarp.name,nearWarp.x,nearWarp.z);msg('🌀 '+nearWarp.name+' をチェックポイント登録');return}
 const r=regionAt(player.position.x,player.position.z);msg('📍 '+regionColor(r));
}

function adaptAI(){
 const now=performance.now();
 if(now-adaptiveAI.lastAdapt<4000)return;
 adaptiveAI.lastAdapt=now;
 const dodgeRate=adaptiveAI.dodges/Math.max(1,adaptiveAI.attacks);
 adaptiveAI.dodgePunish=dodgeRate>.5?1:0;
 adaptiveAI.spamPunish=adaptiveAI.attacks>35?1:0;
 adaptiveAI.aggression=state.hp>state.maxHp*.7?1.15:.9;
}
function updateEnemies(dt){
 let shown=null;
 for(const e of enemies){
  if(!e.alive)continue;const d=dist(player.position,e.obj.position);if(e.boss&&d<14)shown=e;
  if(d<12&&e.wind<=0){const dir=player.position.clone().sub(e.obj.position);
  if(e.nemesis&&nemesis.memory.weapon==='greatsword'&&d<5){dir.multiplyScalar(-1)}
  if(e.nemesis&&nemesis.memory.dodges>10)e.speed*=1.00015;dir.y=0;if(dir.length()>1.4){dir.normalize();e.obj.position.addScaledVector(dir,e.speed*adaptiveAI.aggression*dt)}e.obj.lookAt(player.position.x,e.obj.position.y,player.position.z)}
  e.cd-=dt;
  if(e.wind>0){e.wind-=dt;e.obj.scale.setScalar(1+Math.sin(performance.now()/50)*.08);if(e.wind<=0&&d<(e.boss?3.5:2.2)){e.obj.scale.setScalar(1);if(dodgeTime>0){
   aiProfile.perfectDodges++;
   state.burst=Math.min(100,state.burst+(hasUSkill('abyss_adapt')?22:18));
   if(hasUSkill('afterimage'))state.afterimageTime=2;
   msg('✨ ジャスト回避')
 }else if(parry>0){state.parries++;aiProfile.parries++;damage(e,(30+state.lv*5)*(hasUSkill('parry_master')?1.7:1));AUDIO.parry();msg('⚡ PARRY！')}else{
   let dm=Math.floor((e.atk+Math.floor(Math.random()*7))*liveAI.difficulty);if(guard)dm=Math.floor(dm*.45);if(e.boss&&hasUSkill('abyss_adapt'))dm=Math.floor(dm*.85);state.hp-=dm;animateHitModel();adaptiveAI.damageTaken+=dm;
   if(e.type==='fire'&&Math.random()<.25){state.status='burn';state.statusTime=4}
   if(e.type==='ice'&&Math.random()<.25){state.status='slow';state.statusTime=4}
   msg('💥 '+e.name+' '+dm+'ダメージ')
 }}}
  else if(d<(e.boss?(adaptiveAI.dodgePunish?5.2:4):2.6)&&e.cd<=0){e.cd=e.boss?(adaptiveAI.spamPunish?1.0:1.4):1.8;e.wind=e.boss?(e.phase===3?.34:e.phase===2?.48:(adaptiveAI.dodgePunish?.45:.75)):.5;if(e.boss&&Math.random()<.45)bossPattern(e);msg('⚠️ '+e.name+' 攻撃予兆')}
 }
 if(state.hp<=0){respawnAtCheckpoint();msg('💫 力尽きた…チェックポイントへ帰還')}
 if(shown){bossBox.style.display='block';bossName.textContent=shown.name+(shown.phase===3?' FINAL':shown.phase===2?' PHASE 2':'');bossBar.style.width=(shown.hp/shown.maxHp*100)+'%'}else bossBox.style.display='none';
}

function updateAllies(dt){
 const e=nearest(10);allies.forEach((a,i)=>{a.cd-=dt;const off=[[-1.5,1.6],[1.5,1.7],[0,2.7]][i];const desired=player.position.clone().add(new THREE.Vector3(off[0],0,off[1]));a.obj.position.lerp(desired,Math.min(1,dt*2.4));if(!e)return;if(i===0&&a.cd<=0&&dist(a.obj.position,e.obj.position)<3){damage(e,22);a.cd=1}if(i===1&&a.cd<=0&&dist(a.obj.position,e.obj.position)<8){damage(e,34);a.cd=1.5}if(i===2&&a.cd<=0&&state.hp<state.maxHp*.55){state.hp=Math.min(state.maxHp,state.hp+28);a.cd=2.2;msg('✨ 仲間が回復')}})
}
function updateFake(dt){fakePlayers.forEach((f,i)=>{f.a+=dt*(.12+i*.01);const target=new THREE.Vector3(Math.cos(f.a+i)*18,0,Math.sin(f.a*.8+i)*18);const dir=target.clone().sub(f.obj.position);if(dir.length()>.5){dir.normalize();f.obj.position.addScaledVector(dir,dt*1.7);f.obj.lookAt(target)}})}

function checkUnique(){
 const hour=worldTime/60;
 if(((hour<5||hour>21)||liveAI.eventBias>1.4)&&player.position.x<-22&&player.position.z<-18&&!uniqueBoss.alive&&state.uniqueKills<1){
   uniqueBoss.alive=true;uniqueBoss.obj.visible=true;uniqueBoss.hp=uniqueBoss.maxHp;pop('UNIQUE MONSTER APPEARED',uniqueBoss.name);feed('🌐 月蝕獣の目撃情報')
 }
 if(weather==='rain'&&state.lv>=5&&player.position.x>18&&player.position.z<-18&&!uniqueStorm.alive){
   uniqueStorm.alive=true;uniqueStorm.obj.visible=true;uniqueStorm.hp=uniqueStorm.maxHp;pop('UNIQUE MONSTER APPEARED',uniqueStorm.name)
 }
 if(aiProfile.mined>=25&&player.position.x<-18&&player.position.z>18&&!uniqueForge.alive){
   uniqueForge.alive=true;uniqueForge.obj.visible=true;uniqueForge.hp=uniqueForge.maxHp;pop('UNIQUE MONSTER APPEARED',uniqueForge.name)
 }
 if(state.lv>=10&&aiProfile.parries>=8&&player.position.x>20&&player.position.z>20&&!uniqueWarden.alive){
   uniqueWarden.alive=true;uniqueWarden.obj.visible=true;uniqueWarden.hp=uniqueWarden.maxHp;pop('UNIQUE MONSTER APPEARED',uniqueWarden.name)
 }
}

const skillState={power:0,stamina:0,magic:0,build:0};
const jobs={
 adventurer:{name:'冒険者',atk:1,mp:1,st:1},
 swordsman:{name:'剣聖',atk:1.22,mp:.9,st:1.08},
 guardian:{name:'守護騎士',atk:1.02,mp:.9,st:1.25},
 mage:{name:'魔導士',atk:.9,mp:1.35,st:.9},
 hunter:{name:'狩人',atk:1.12,mp:1.05,st:1.08},
 builder:{name:'開拓者',atk:.95,mp:1,st:1.18}
};
let jobKey='adventurer';

const ITEM_DB=[
 // 片手剣
 {id:'sw01',name:'旅人の剣',slot:'weapon',weapon:'sword',rar:'common',power:3,price:40},
 {id:'sw02',name:'青銅の剣',slot:'weapon',weapon:'sword',rar:'common',power:5,price:70},
 {id:'sw03',name:'騎士の剣',slot:'weapon',weapon:'sword',rar:'rare',power:8,price:140},
 {id:'sw04',name:'疾風の剣',slot:'weapon',weapon:'sword',rar:'epic',power:12,price:260,set:'gale'},
 {id:'sw05',name:'聖銀剣ルクス',slot:'weapon',weapon:'sword',rar:'legend',power:18,price:520,set:'holy'},
 {id:'sw06',name:'月蝕剣ネブラ',slot:'weapon',weapon:'sword',rar:'unique',power:25,price:0,boss:'unique'},
 // 大剣
 {id:'gs01',name:'鉄の大剣',slot:'weapon',weapon:'greatsword',rar:'common',power:7,price:90},
 {id:'gs02',name:'巨人の大剣',slot:'weapon',weapon:'greatsword',rar:'rare',power:11,price:180},
 {id:'gs03',name:'断岩剣',slot:'weapon',weapon:'greatsword',rar:'epic',power:15,price:320,set:'stone'},
 {id:'gs04',name:'獄炎大剣ヴァルガ',slot:'weapon',weapon:'greatsword',rar:'unique',power:28,price:0,boss:'fire'},
 // 槍
 {id:'sp01',name:'兵士の槍',slot:'weapon',weapon:'spear',rar:'common',power:6,price:80},
 {id:'sp02',name:'白銀槍',slot:'weapon',weapon:'spear',rar:'rare',power:10,price:170},
 {id:'sp03',name:'星喰いの槍',slot:'weapon',weapon:'spear',rar:'legend',power:20,price:580,set:'astral'},
 {id:'sp04',name:'氷狼槍フェンリル',slot:'weapon',weapon:'spear',rar:'unique',power:27,price:0,boss:'ice'},
 // 弓
 {id:'bw01',name:'狩人の弓',slot:'weapon',weapon:'bow',rar:'common',power:5,price:75},
 {id:'bw02',name:'森人の弓',slot:'weapon',weapon:'bow',rar:'rare',power:9,price:160,set:'forest'},
 {id:'bw03',name:'月影弓',slot:'weapon',weapon:'bow',rar:'epic',power:14,price:300,set:'phantom'},
 {id:'bw04',name:'天穿弓アルテア',slot:'weapon',weapon:'bow',rar:'legend',power:21,price:620,set:'astral'},
 // 杖
 {id:'st01',name:'樫の杖',slot:'weapon',weapon:'staff',rar:'common',power:4,price:65},
 {id:'st02',name:'魔導杖',slot:'weapon',weapon:'staff',rar:'rare',power:9,price:170},
 {id:'st03',name:'賢者の杖',slot:'weapon',weapon:'staff',rar:'epic',power:15,price:340,set:'sage'},
 {id:'st04',name:'深淵杖アビス',slot:'weapon',weapon:'staff',rar:'unique',power:30,price:0,boss:'abyss'},
 // 防具
 {id:'ar01',name:'革の鎧',slot:'armor',rar:'common',power:4,price:60},
 {id:'ar02',name:'鉄の鎧',slot:'armor',rar:'common',power:7,price:100},
 {id:'ar03',name:'鋼鉄鎧',slot:'armor',rar:'rare',power:10,price:180},
 {id:'ar04',name:'疾風の外套',slot:'armor',rar:'epic',power:13,price:280,set:'gale'},
 {id:'ar05',name:'竜鱗鎧',slot:'armor',rar:'legend',power:19,price:520,set:'dragon'},
 {id:'ar06',name:'氷狼の外套',slot:'armor',rar:'unique',power:24,price:0,boss:'ice'},
 {id:'ar07',name:'獄炎鎧',slot:'armor',rar:'unique',power:25,price:0,boss:'fire'},
 {id:'ar08',name:'深淵装束',slot:'armor',rar:'unique',power:27,price:0,boss:'abyss'},
 // アクセサリー
 {id:'ac01',name:'力の指輪',slot:'accessory',rar:'common',power:3,price:80},
 {id:'ac02',name:'守りの指輪',slot:'accessory',rar:'rare',power:6,price:140},
 {id:'ac03',name:'幻影の指輪',slot:'accessory',rar:'epic',power:9,price:250,set:'phantom'},
 {id:'ac04',name:'星読みの首飾り',slot:'accessory',rar:'legend',power:13,price:460,set:'astral'},
 {id:'ac05',name:'月蝕の指輪',slot:'accessory',rar:'unique',power:18,price:0,boss:'unique'},
 {id:'ac06',name:'竜心核',slot:'accessory',rar:'legend',power:15,price:500,set:'dragon'},
 // 消耗品
 {id:'co01',name:'ポーション',slot:'consumable',rar:'common',power:50,price:35},
 {id:'co02',name:'ハイポーション',slot:'consumable',rar:'rare',power:100,price:80},
 {id:'co03',name:'エーテル',slot:'consumable',rar:'rare',power:50,price:90},
 {id:'co04',name:'スタミナ薬',slot:'consumable',rar:'rare',power:60,price:85},
 {id:'co05',name:'万能薬',slot:'consumable',rar:'epic',power:1,price:130},
 {id:'co06',name:'蘇生の雫',slot:'consumable',rar:'legend',power:1,price:350},
 // 素材
 {id:'ma01',name:'鉄鉱石',slot:'material',rar:'common',power:1,price:10},
 {id:'ma02',name:'魔石',slot:'material',rar:'rare',power:1,price:25},
 {id:'ma03',name:'星晶石',slot:'material',rar:'epic',power:1,price:60},
 {id:'ma04',name:'竜鱗',slot:'material',rar:'legend',power:1,price:120},
 {id:'ma05',name:'炎獄核',slot:'material',rar:'unique',power:1,price:0,boss:'fire'},
 {id:'ma06',name:'氷帝核',slot:'material',rar:'unique',power:1,price:0,boss:'ice'},
 {id:'ma07',name:'深淵核',slot:'material',rar:'unique',power:1,price:0,boss:'abyss'},
 {id:'ma08',name:'月蝕核',slot:'material',rar:'unique',power:1,price:0,boss:'unique'},
 // 建築・釣り・クエスト
 {id:'ut01',name:'上質な木材',slot:'material',rar:'rare',power:1,price:20},
 {id:'ut02',name:'強化石',slot:'material',rar:'rare',power:1,price:40},
 {id:'ut03',name:'黄金魚',slot:'material',rar:'epic',power:1,price:150},
 {id:'ut04',name:'古代鍵',slot:'quest',rar:'epic',power:1,price:0},
 {id:'ut05',name:'禁足地の紋章',slot:'quest',rar:'legend',power:1,price:0},
 {id:'ut06',name:'世界樹の種',slot:'quest',rar:'unique',power:1,price:0}
];
const ITEM_BY_ID=Object.fromEntries(ITEM_DB.map(i=>[i.id,i]));
const discoveredItems=new Set();
const ownedCounts={};
const forgeLevels={};
const affixes=['会心率+5%','ジャスト回避後ATK+20%','炎耐性+15%','氷耐性+15%','MP回復+10%','スタミナ消費-8%','ボス特攻+12%','ドロップ率+8%'];

function itemRoll(base){
  const affix=(base.slot==='weapon'||base.slot==='armor'||base.slot==='accessory')?affixes[Math.floor(Math.random()*affixes.length)]:null;
  return {...base,uid:base.id+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),affix,forge:0};
}
function giveItem(id,count=1){
  const base=ITEM_BY_ID[id];if(!base)return;
  discoveredItems.add(id);ownedCounts[id]=(ownedCounts[id]||0)+count;
  for(let i=0;i<count;i++)inventory.push(itemRoll(base));
  pop('🎁 ITEM',base.name+(count>1?' ×'+count:''));
}

let worldEvent={active:false,type:null,time:0};
let adaptiveAI={aggression:1,dodgePunish:0,spamPunish:0,damageTaken:0,attacks:0,dodges:0,lastAdapt:0};

const aiProfile={
  attacks:0,skills:0,dodges:0,perfectDodges:0,parries:0,
  lowHpBossKills:0,noDamageKills:0,weaponUse:{sword:0,greatsword:0,spear:0,bow:0,staff:0},
  mined:0,built:0,fished:0,uniqueKills:0,totalKills:0,bossKills:0,
  lastAwardCheck:0,awards:0
};

const uniqueSkills={};
const uniqueSkillCatalog=[
 {id:'afterimage',name:'残影の境地',rar:'Unique',desc:'ジャスト回避後2秒、移動速度+35%',cond:p=>p.perfectDodges>=12,score:p=>p.perfectDodges*4+p.dodges},
 {id:'sword_demon',name:'剣鬼',rar:'Unique',desc:'片手剣コンボ上限+3、連撃ダメージ+12%',cond:p=>p.weaponUse.sword>=80,score:p=>p.weaponUse.sword*2+p.totalKills},
 {id:'giant_breaker',name:'星砕き',rar:'Unique',desc:'大剣の部位破壊ダメージ+50%',cond:p=>p.weaponUse.greatsword>=55,score:p=>p.weaponUse.greatsword*2+p.bossKills*8},
 {id:'abyss_adapt',name:'深淵適応',rar:'Unique',desc:'ボス被ダメージ-15%、必殺ゲージ獲得+20%',cond:p=>p.uniqueKills>=1&&p.bossKills>=2,score:p=>p.uniqueKills*40+p.bossKills*15},
 {id:'last_stand',name:'逆境覚醒',rar:'Unique',desc:'HP25%以下で攻撃力+35%',cond:p=>p.lowHpBossKills>=1,score:p=>p.lowHpBossKills*80+p.bossKills*10},
 {id:'untouched',name:'無傷の覇者',rar:'Unique',desc:'ノーダメージ討伐後30秒、会心率+15%',cond:p=>p.noDamageKills>=5,score:p=>p.noDamageKills*20},
 {id:'pioneer',name:'開拓王',rar:'Unique',desc:'採掘・建築で素材獲得量+50%、建築消費軽減',cond:p=>p.mined>=25&&p.built>=15,score:p=>p.mined+p.built*2},
 {id:'fisher_sage',name:'水鏡の賢者',rar:'Unique',desc:'釣り成功時、低確率でレア素材を追加獲得',cond:p=>p.fished>=12,score:p=>p.fished*5},
 {id:'parry_master',name:'刹那返し',rar:'Unique',desc:'パリィ成功時にカウンターダメージ+70%',cond:p=>p.parries>=10,score:p=>p.parries*8},
 {id:'arcane_flow',name:'魔脈共鳴',rar:'Unique',desc:'杖スキル消費MP-20%、威力+18%',cond:p=>p.weaponUse.staff>=60,score:p=>p.weaponUse.staff*2+p.skills*2}
];

function awardUniqueSkill(skill, reason=''){
  if(uniqueSkills[skill.id])return;
  uniqueSkills[skill.id]={...skill,obtainedAt:Date.now()};
  aiProfile.awards++;
  pop('AI UNIQUE SKILL AWARDED',skill.name);
  feed(`🤖 AI WORLD MASTER：${skill.name} を付与`);
  msg(`🌟 ユニークスキル「${skill.name}」獲得！ ${reason||skill.desc}`);
}

function evaluateUniqueSkills(force=false){
  const now=performance.now();
  if(!force && now-aiProfile.lastAwardCheck<3000)return;
  aiProfile.lastAwardCheck=now;
  const candidates=uniqueSkillCatalog
    .filter(s=>!uniqueSkills[s.id]&&s.cond(aiProfile))
    .sort((a,b)=>b.score(aiProfile)-a.score(aiProfile));
  if(candidates.length){
    // AI運営として最も現在のプレイ傾向に近いものを1つだけ付与
    awardUniqueSkill(candidates[0],'あなたのプレイ傾向をAIが分析して選出');
  }
}

function hasUSkill(id){return !!uniqueSkills[id]}



const AI_JOBS=[
 {id:'shadow_runner',name:'影走士',desc:'回避・移動特化',cond:p=>p.perfectDodges>=8&&p.dodges>=20},
 {id:'breaker',name:'破城闘士',desc:'大剣・部位破壊特化',cond:p=>p.weaponUse.greatsword>=35},
 {id:'spellblade',name:'魔剣士',desc:'剣と魔法の複合型',cond:p=>p.weaponUse.sword>=25&&p.skills>=25},
 {id:'warden',name:'境界守護者',desc:'防御・パリィ特化',cond:p=>p.parries>=8},
 {id:'seeker',name:'深層探索者',desc:'採掘・探索・隠し要素特化',cond:p=>p.mined>=18&&p.totalKills>=15},
 {id:'monster_slayer',name:'異形狩り',desc:'ボス・ユニーク特攻',cond:p=>p.bossKills>=2||p.uniqueKills>=1}
];
let evolvedJob=null;

const LIVE_EVENTS=[
 {id:'bloodmoon',name:'紅月',desc:'夜間、敵が強化されレアドロップ率上昇',weight:1},
 {id:'golden_hour',name:'黄金探索期',desc:'宝箱・素材ドロップ率上昇',weight:1},
 {id:'hunter_wave',name:'狩人の試練',desc:'強敵群がプレイヤーを追跡',weight:1},
 {id:'quiet_world',name:'静穏期',desc:'敵が弱体化し探索しやすくなる',weight:1},
 {id:'unique_rumor',name:'ユニークモンスターの噂',desc:'特殊ボス出現条件が緩和',weight:1},
 {id:'craft_boom',name:'開拓ブーム',desc:'採掘・建築素材の獲得量上昇',weight:1}
];

function aiLog(t){
  liveAI.history.unshift(new Date().toLocaleTimeString()+' '+t);
  if(liveAI.history.length>20)liveAI.history.length=20;
}

function chooseLiveEvent(){
  let pool=[...LIVE_EVENTS];
  if(liveAI.explorationBias>.5)pool.push(pool.find(e=>e.id==='unique_rumor'));
  if(liveAI.buildingBias>.5)pool.push(pool.find(e=>e.id==='craft_boom'));
  if(liveAI.pressure>.6)pool.push(pool.find(e=>e.id==='quiet_world'));
  if(liveAI.mercy>.6)pool.push(pool.find(e=>e.id==='golden_hour'));
  return pool[Math.floor(Math.random()*pool.length)];
}

function triggerLiveEvent(){
  const ev=chooseLiveEvent();
  liveAI.lastEvent=ev.name;
  liveAI.generation++;
  aiLog('イベント生成: '+ev.name);
  pop('AI WORLD EVENT',ev.name);
  feed('🧠 LIVE AI：'+ev.desc);

  if(ev.id==='bloodmoon'){
    adaptiveAI.aggression=Math.max(adaptiveAI.aggression,1.35);
    liveAI.dropBias=1.4;
  }
  if(ev.id==='golden_hour'){
    liveAI.dropBias=1.65;
  }
  if(ev.id==='hunter_wave'){
    for(let i=0;i<5;i++){
      enemy(i%2?'wolf':'orc',player.position.x+Math.random()*12-6,player.position.z+Math.random()*12-6);
    }
  }
  if(ev.id==='quiet_world'){
    liveAI.difficulty=Math.max(.72,liveAI.difficulty-.18);
    adaptiveAI.aggression=.8;
  }
  if(ev.id==='unique_rumor'){
    liveAI.eventBias=1.7;
  }
  if(ev.id==='craft_boom'){
    liveAI.buildingBias=1;
  }
}

function evolveJobIfNeeded(){
  if(evolvedJob)return;
  const found=AI_JOBS.find(j=>j.cond(aiProfile));
  if(found){
    evolvedJob=found;
    state.job=found.name;
    pop('AI JOB EVOLUTION',found.name);
    feed('🧬 AIが職業進化を決定：'+found.name);
    aiLog('職業進化: '+found.name);
  }
}

function liveAIDecision(){
  if(!liveAI.enabled)return;
  const now=performance.now();
  if(now-liveAI.lastDecision<6000)return;
  liveAI.lastDecision=now;
  liveAI.tick++;

  const hpRate=state.hp/Math.max(1,state.maxHp);
  const dodgeRatio=aiProfile.perfectDodges/Math.max(1,aiProfile.dodges);
  const bossSuccess=aiProfile.bossKills/Math.max(1,aiProfile.totalKills);

  liveAI.explorationBias=Math.min(1,(aiProfile.mined+aiProfile.fished)/40);
  liveAI.buildingBias=Math.min(1,aiProfile.built/20);
  liveAI.combatBias=Math.min(1,aiProfile.totalKills/40);

  liveAI.mercy=hpRate<.35?0.9:Math.max(0,adaptiveAI.damageTaken/900);
  liveAI.pressure=(hpRate>.75&&bossSuccess>.08)?0.8:0.2;

  if(liveAI.mercy>.6){
    liveAI.mood='support';
    liveAI.difficulty=Math.max(.72,liveAI.difficulty-.05);
    liveAI.dropBias=Math.min(1.8,liveAI.dropBias+.1);
  }else if(liveAI.pressure>.6){
    liveAI.mood='challenge';
    liveAI.difficulty=Math.min(1.55,liveAI.difficulty+.05);
    adaptiveAI.aggression=Math.min(1.45,adaptiveAI.aggression+.05);
  }else{
    liveAI.mood='balanced';
    liveAI.difficulty+=(1-liveAI.difficulty)*.15;
    liveAI.dropBias+=(1-liveAI.dropBias)*.15;
  }

  if(dodgeRatio>.55){
    adaptiveAI.dodgePunish=1;
  }

  if(Math.random()<.32*liveAI.eventBias){
    triggerLiveEvent();
  }

  evolveJobIfNeeded();
  evaluateUniqueSkills(true);

  aiLog(`更新: mood=${liveAI.mood} difficulty=${liveAI.difficulty.toFixed(2)}`);
}

function liveAIStatusText(){
  return `🤖 LIVE AI<br>状態:${liveAI.mood}<br>難易度:${liveAI.difficulty.toFixed(2)}<br>イベント:${liveAI.lastEvent}<br>更新:${liveAI.tick}回`;
}

function aiSkillSummary(){
  const owned=Object.values(uniqueSkills);
  if(!owned.length)return 'まだユニークスキルはありません。AIがプレイ傾向を分析中です。';
  return owned.map(s=>`<div class="row skillUnique"><b>🌟 ${s.name}</b><br><span class="itemStat">${s.desc}</span></div>`).join('');
}



function buySkill(k){if(state.sp<1)return;state.sp--;skillState[k]++;if(k==='power')state.atkBonus+=5;if(k==='stamina')state.maxSt+=10;if(k==='magic')state.maxMp+=8;if(k==='build')mats.blocks+=10;refreshMenus()}

function craft(k){
 if(k==='crystalBlade'){if(mats.crystal<3||mats.iron<4)return msg('素材不足：クリスタル3 / 鉄4');mats.crystal-=3;mats.iron-=4;giveItem('sw05');refreshMenus();return}
 if(k==='bossArmor'){if(mats.bossCore<2||mats.iron<5)return msg('素材不足：ボス核2 / 鉄5');mats.bossCore-=2;mats.iron-=5;giveItem('ar05');refreshMenus();return}
 if(k==='uniqueCharm'){if(mats.magic<5||mats.crystal<2)return msg('素材不足：魔石5 / クリスタル2');mats.magic-=5;mats.crystal-=2;giveItem('ac04');refreshMenus();return}

 if(k==='steel'){if(mats.iron<3||mats.stone<2)return msg('素材不足');mats.iron-=3;mats.stone-=2;inventory.push({name:'鋼鉄装備',rar:'rare',power:8})}
 if(k==='potion'){if(mats.herb<3)return msg('薬草不足');mats.herb-=3;state.hp=Math.min(state.maxHp,state.hp+80)}
 if(k==='magic'){if(mats.magic<2)return msg('魔石不足');mats.magic-=2;state.maxMp+=5}
 refreshMenus();msg('🔨 クラフト成功');
}
function openModal(id){document.getElementById(id).style.display='block';refreshMenus()}
function closeModal(id){document.getElementById(id).style.display='none'}

function changeJob(k){
 jobKey=k;state.job=jobs[k].name;msg('🧬 職業変更：'+state.job);refreshMenus();
}
function enterDungeon(){
 state.dungeonFloor=Math.max(1,state.dungeonFloor);
 for(let i=0;i<5+Math.floor(state.dungeonFloor/10);i++) enemy(i%3===0?'orc':i%2?'wolf':'slime',player.position.x+Math.random()*10-5,player.position.z+Math.random()*10-5);
 feed('🗼 深層ダンジョン '+state.dungeonFloor+'F');
}
function bossRush(){
 const start=performance.now();
 enemy('fire',player.position.x+8,player.position.z,true);
 enemy('ice',player.position.x-8,player.position.z,true);
 enemy('abyss',player.position.x,player.position.z+10,true);
 feed('🔥 ボスラッシュ開始');
 setTimeout(()=>{const alive=enemies.some(e=>e.alive&&e.boss&&dist(player.position,e.obj.position)<20);if(!alive){const t=(performance.now()-start)/1000;state.bossRushBest=state.bossRushBest?Math.min(state.bossRushBest,t):t;pop('BOSS RUSH CLEAR',t.toFixed(1)+'秒')}} ,30000);
}
function newGamePlus(){
 if(state.lv<10)return msg('Lv10以上で解放');
 state.ngPlus++;state.lv=1;state.xp=0;state.hp=state.maxHp;state.mp=state.maxMp;
 enemies.forEach(e=>{if(e.boss){e.alive=true;e.obj.visible=true;e.hp=e.maxHp*(1+state.ngPlus*.45);e.atk=Math.floor(e.atk*(1+state.ngPlus*.25))}});
 feed('♾️ New Game+ '+state.ngPlus+' 開始');
}
window.changeJob=changeJob;window.enterDungeon=enterDungeon;window.bossRush=bossRush;window.newGamePlus=newGamePlus;
window.resetHeal=()=>{SELF_HEAL.reset();refreshMenus()};window.safeRestart=()=>window.__selfHealSafeRestart();

function refreshMenus(){
 document.getElementById('weaponContent').innerHTML=Object.entries(weapons).map(([k,w])=>`<div class="row">${w.name} ATK:${w.atk} / ${w.skill}<button onclick="window.equipW('${k}')">装備</button></div>`).join('');
 document.getElementById('bagContent').innerHTML=`<div class="row">石:${mats.stone} 木:${mats.wood} 鉄:${mats.iron} 魚:${mats.fish} クリスタル:${mats.crystal} ボス核:${mats.bossCore} ブロック:${mats.blocks}</div><div class="row">SET効果：${setBonusText()}</div>`+inventory.map((i,n)=>`<div class="row ${i.rar}">${i.name} ${i.forge?('+'+i.forge):''} <span class="itemStat">PWR:${i.power} ${i.affix||''}</span>${['weapon','armor','accessory'].includes(i.slot)?`<button onclick="window.equipItem(${n})">装備</button>`:i.slot==='consumable'?`<button onclick="window.useItem(${n})">使用</button>`:''}<button onclick="window.sellItem(${n})">売る</button></div>`).join('');
 document.getElementById('craftContent').innerHTML=`<div class="row">聖銀剣ルクス <button onclick="window.craftX('crystalBlade')">クリスタル3+鉄4</button></div><div class="row">竜鱗鎧 <button onclick="window.craftX('bossArmor')">ボス核2+鉄5</button></div><div class="row">星読みの首飾り <button onclick="window.craftX('uniqueCharm')">魔石5+クリスタル2</button></div>`+`<div class="row">鋼鉄装備 <button onclick="window.craftX('steel')">鉄3+石2</button></div><div class="row">回復薬 <button onclick="window.craftX('potion')">薬草3</button></div><div class="row">魔力強化 <button onclick="window.craftX('magic')">魔石2</button></div>`;
 document.getElementById('questContent').innerHTML=`<div class="row">討伐 5体：${quests.hunt.done?'✅':'⏳ '+kills+'/5'}</div><div class="row">採掘 10回：${quests.mine.done?'✅':'⏳ '+mined+'/10'}</div><div class="row">釣り 3匹：${quests.fish.done?'✅':'⏳ '+fished+'/3'}</div>`;
 document.getElementById('skillContent').innerHTML=`SP:${state.sp}<div class="row">攻撃強化 Lv.${skillState.power}<button onclick="window.buyS('power')">SP1</button></div><div class="row">スタミナ Lv.${skillState.stamina}<button onclick="window.buyS('stamina')">SP1</button></div><div class="row">魔力 Lv.${skillState.magic}<button onclick="window.buyS('magic')">SP1</button></div><div class="row">建築 Lv.${skillState.build}<button onclick="window.buyS('build')">SP1</button></div>`;
 document.getElementById('classContent').innerHTML=Object.entries(jobs).map(([k,j])=>`<div class="row">${j.name}<button onclick="window.changeJob('${k}')">変更</button></div>`).join('');

 renderOrigin();
 renderWorldAI();
 document.getElementById('selfHealContent').innerHTML=`<div class="row">モード:${SAFE_MODE?'SAFE':'NORMAL'}<br>隔離中:${[...SELF_HEAL.disabled].join(', ')||'なし'}<br>エラー:${SELF_HEAL.errors.length}</div>`+SELF_HEAL.errors.slice(0,10).map(e=>`<div class="row">[${e.system}] ${e.message}</div>`).join('');
 document.getElementById('liveAIContent').innerHTML=
 `<div class="row">LIVE AI: ${liveAI.enabled?'ON':'OFF'}<br>状態:${liveAI.mood}<br>難易度:${liveAI.difficulty.toFixed(2)}<br>ドロップ補正:${liveAI.dropBias.toFixed(2)}<br>イベント:${liveAI.lastEvent}<br>AI更新回数:${liveAI.tick}</div>`+
 `<div class="row">AI職業進化：${evolvedJob?evolvedJob.name:'未発生'}</div>`+
 liveAI.history.map(x=>`<div class="row">${x}</div>`).join('');
 document.getElementById('aiMasterContent').innerHTML=
 `<div class="row">AI分析<br>攻撃:${aiProfile.attacks} / 技:${aiProfile.skills} / 回避:${aiProfile.dodges} / ジャスト:${aiProfile.perfectDodges} / パリィ:${aiProfile.parries}<br>討伐:${aiProfile.totalKills} / ボス:${aiProfile.bossKills} / ユニーク:${aiProfile.uniqueKills}<br>採掘:${aiProfile.mined} / 建築:${aiProfile.built} / 釣り:${aiProfile.fished}</div>`+
 `<div class="row">AI付与済みユニークスキル：${Object.keys(uniqueSkills).length}</div>`+
 aiSkillSummary();
 document.getElementById('catalogContent').innerHTML=ITEM_DB.map(it=>`<div class="row ${it.rar} ${discoveredItems.has(it.id)?'owned':''}">${discoveredItems.has(it.id)?'✅':'❓'} ${it.name}<br><span class="itemStat">${it.slot} / PWR:${it.power} / ${it.rar}${it.boss?' / BOSS DROP':''}</span></div>`).join('');
 const shopPool=ITEM_DB.filter(i=>i.price>0&&['weapon','armor','accessory','consumable'].includes(i.slot)).slice(0,28);
 document.getElementById('shopContent').innerHTML=`所持金:${state.gold}G`+shopPool.map(it=>`<div class="row ${it.rar}">${it.name} ${it.price}G <button onclick="window.buyItem('${it.id}')">買う</button></div>`).join('');
 document.getElementById('forgeContent').innerHTML=inventory.map((i,n)=>['weapon','armor','accessory'].includes(i.slot)?`<div class="row ${i.rar}">${i.name} ${i.forge?('+'+i.forge):''} PWR:${i.power}<button onclick="window.forgeItem(${n})">強化</button></div>`:'').join('');

 document.getElementById('endgameContent').innerHTML=`<div class="row">100階ダンジョン 現在:${state.dungeonFloor}F <button onclick="window.enterDungeon()">挑戦</button></div><div class="row">ボスラッシュ BEST:${state.bossRushBest?state.bossRushBest.toFixed(1)+'秒':'---'} <button onclick="window.bossRush()">開始</button></div><div class="row">New Game+ ${state.ngPlus} <button onclick="window.newGamePlus()">開始</button></div><div class="row">セット効果:${setBonus()||'なし'}</div>`;
}

function applyEquipmentVisual(){
  // weapon glow / armor tint / accessory aura
  const w=equippedSet.weapon, a=equippedSet.armor, ac=equippedSet.accessory;
  if(hero.children[0]?.material){
    const base = a?.rar==='unique'?0x7c62aa:a?.rar==='legend'?0x876d38:0x3f79d6;
    hero.children[0].material.color.set(base);
  }
  if(frontGlow?.material){
    frontGlow.material.color.set(ac?.rar==='unique'?0x9dffdf:ac?.rar==='legend'?0xffdf73:0xbff3ff);
  }
  weaponPivot.scale.setScalar(w?1+Math.min(.22,(w.forge||0)*.025):1);
}

function equipItem(i){
 const it=inventory[i];if(!it||!['weapon','armor','accessory'].includes(it.slot))return;
 equippedSet[it.slot]=it;
 if(it.slot==='weapon'){
   state.atkBonus=Math.max(state.atkBonus,it.power);
   if(it.weapon) equipWeapon(it.weapon);
 }
 if(it.slot==='armor')state.maxHp+=Math.floor(it.power*.5);
 applyEquipmentVisual();refreshMenus();msg('🛡️ '+it.name+'を装備');
}

function itemValue(it){return Math.floor((it.price||20)*(1+(it.forge||0)*.35));}
function sellItem(i){
  const it=inventory[i];if(!it)return;
  const v=Math.max(1,Math.floor(itemValue(it)*.55));state.gold+=v;
  ownedCounts[it.id]=Math.max(0,(ownedCounts[it.id]||1)-1);
  inventory.splice(i,1);msg(`💰 ${it.name}を${v}Gで売却`);refreshMenus();
}
function buyItem(id){
  const b=ITEM_BY_ID[id];if(!b||b.price<=0)return;
  if(state.gold<b.price)return msg('💰 ゴールド不足');
  state.gold-=b.price;giveItem(id);refreshMenus();
}
function forgeItem(i){
  const it=inventory[i];if(!it||!['weapon','armor','accessory'].includes(it.slot))return;
  const cost=50+(it.forge||0)*80;
  if(state.gold<cost||mats.iron<1)return msg('⚒️ ゴールドか鉄が足りない');
  state.gold-=cost;mats.iron--;it.forge=(it.forge||0)+1;it.power+=2;
  forgeLevels[it.uid]=it.forge;msg(`⚒️ ${it.name} +${it.forge} に強化`);refreshMenus();
}
function useItem(i){
  const it=inventory[i];if(!it||it.slot!=='consumable')return;
  if(it.id==='co01'||it.id==='co02')state.hp=Math.min(state.maxHp,state.hp+it.power);
  if(it.id==='co03')state.mp=Math.min(state.maxMp,state.mp+it.power);
  if(it.id==='co04')state.st=Math.min(state.maxSt,state.st+it.power);
  if(it.id==='co05'){state.status=null;state.statusTime=0}
  inventory.splice(i,1);ownedCounts[it.id]=Math.max(0,(ownedCounts[it.id]||1)-1);msg(`🧪 ${it.name}を使用`);refreshMenus();
}

function setBonus(){
 const safeEquipped=equippedSet||{weapon:null,armor:null,accessory:null};
 const sets=Object.values(safeEquipped).filter(Boolean).map(x=>x.set).filter(Boolean);
 const counts={};sets.forEach(s=>counts[s]=(counts[s]||0)+1);
 const active=Object.entries(counts).find(([s,c])=>c>=2);
 return active?active[0]:null;
}
function setBonusText(){
 const s=setBonus();
 return s?({gale:'疾風：移動速度+10%',holy:'聖銀：回復量+20%',stone:'断岩：部位破壊+25%',astral:'星辰：スキル威力+20%',forest:'森人：弓射程+15%',phantom:'幻影：回避無敵+0.1秒',sage:'賢者：MP回復+20%',dragon:'竜鱗：最大HP+15%'}[s]||s):'なし';
}
window.equipW=equipWeapon;window.equipItem=equipItem;window.sellItem=sellItem;window.buyItem=buyItem;window.forgeItem=forgeItem;window.useItem=useItem;window.craftX=craft;window.buyS=buySkill;window.openModal=openModal;window.closeModal=closeModal;


let lastRegionName='';
function updateZoneBanner(){
 const rn=regionColor(regionAt(player.position.x,player.position.z));
 if(rn!==lastRegionName){
  lastRegionName=rn;
  const b=document.getElementById('zoneBanner');b.textContent=rn;b.style.display='block';
  setTimeout(()=>b.style.display='none',1800);
 }
}

function hud(){
 const hp=state.hp/state.maxHp*100,mp=state.mp/state.maxMp*100,st=state.st/state.maxSt*100;
 document.getElementById('stats').innerHTML=
 `Lv.${state.lv}　💰${state.gold}G　SP:${state.sp}<br>`+
 `❤️ <span class="bar"><span class="fill hp" style="display:block;width:${hp}%"></span></span> ${Math.ceil(state.hp)}<br>`+
 `💧 <span class="bar"><span class="fill mp" style="display:block;width:${mp}%"></span></span>`+
 `　🟢 <span class="bar"><span class="fill st" style="display:block;width:${st}%"></span></span><br>`+
 `⚔️ ${weapons[weaponKey].name}　⚡${Math.floor(state.burst)}%`;
}
function miniDraw(){
 mctx.clearRect(0,0,110,110);mctx.fillStyle='#13212b';mctx.fillRect(0,0,110,110);
 const map=v=>55+v*1.5;for(const e of enemies)if(e.alive&&e.boss){mctx.fillStyle='#ff4d5d';mctx.beginPath();mctx.arc(map(e.obj.position.x),map(e.obj.position.z),3,0,7);mctx.fill()}
 mctx.fillStyle='#4aa3ff';mctx.beginPath();mctx.arc(map(player.position.x),map(player.position.z),4,0,7);mctx.fill();
}

function animateAttackModel(power=1){
  hero.userData.attackAnim=.22+power*.04;
  hero.userData.attackPower=power;
}
function animateDodgeModel(){
  hero.userData.dodgeAnim=.36;
}
function animateHitModel(){
  hero.userData.hitAnim=.24;
}
function updateHeroAnimation(dt){
  const u=hero.userData;
  if(u.attackAnim>0){
    u.attackAnim-=dt;
    const t=Math.max(0,u.attackAnim/.28);
    u.ra.rotation.x=-1.8*(1-t);u.la.rotation.x=.6*(1-t);
    hero.rotation.z=Math.sin((1-t)*Math.PI)*-.08;
  } else if(u.dodgeAnim>0){
    u.dodgeAnim-=dt;
    hero.rotation.z=-.28*Math.sin((1-u.dodgeAnim/.36)*Math.PI);
  } else if(u.hitAnim>0){
    u.hitAnim-=dt;
    hero.rotation.x=.14*Math.sin((1-u.hitAnim/.24)*Math.PI*2);
  } else {
    hero.rotation.x=0;hero.rotation.z=0;
  }
}

function animateHumanoid(g,moving,dt){const u=g.userData;if(!u?.ll)return;u.walk=(u.walk||0)+dt*(moving?7:1);const s=Math.sin(u.walk)*.5;u.ll.rotation.x=s;u.rl.rotation.x=-s;u.la.rotation.x=-s*.7;u.ra.rotation.x=s*.7}

let cameraDrag=false,lastX=0,lastY=0,cameraPointer=null;
function uiTarget(t){return !!t.closest('#stick,#actions,#menu,#hud,#boss,#log,.modal,#titleBadge,#worldFeed')}
document.addEventListener('pointerdown',e=>{if(uiTarget(e.target))return;cameraDrag=true;cameraPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY});
document.addEventListener('pointermove',e=>{if(!cameraDrag||e.pointerId!==cameraPointer)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;targetYaw-=dx*.006*SETTINGS.cameraSensitivity;targetPitch=Math.max(.12,Math.min(1.0,targetPitch+dy*.0045*SETTINGS.cameraSensitivity))});
document.addEventListener('pointerup',e=>{if(e.pointerId===cameraPointer){cameraDrag=false;cameraPointer=null}});

const stick=document.getElementById('stick'),knob=document.getElementById('knob');let stickOn=false;
function setJoy(x,y){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,max=r.width*.32,len=Math.hypot(dx,dy)||1,cl=Math.min(max,len);joy.x=dx/len*(cl/max);joy.y=dy/len*(cl/max);knob.style.transform=`translate(${joy.x*max}px,${joy.y*max}px)`}
stick.onpointerdown=e=>{stickOn=true;stick.setPointerCapture(e.pointerId);setJoy(e.clientX,e.clientY)};stick.onpointermove=e=>{if(stickOn)setJoy(e.clientX,e.clientY)};function endJoy(){stickOn=false;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}stick.onpointerup=endJoy;stick.onpointercancel=endJoy;


document.getElementById('quickHeal').addEventListener('pointerdown',()=>{
  AUDIO.ui();
  const idx=inventory.findIndex(i=>i.id==='co02'||i.id==='co01');
  if(idx>=0){useItem(idx);return}
  heal();
});

attackBtn.onpointerdown=attack;skillBtn.onpointerdown=skill;dodgeBtn.onpointerdown=dodge;guardBtn.onpointerdown=guardFn;healBtn.onpointerdown=heal;burstBtn.onpointerdown=burst;interactBtn.onpointerdown=interact;

// ===== v14 safe boot =====
function bootGame(){
 SELF_HEAL.run('initial-equip',()=>equipWeapon('sword'));
 SELF_HEAL.run('menus',()=>refreshMenus());
 if(SAFE_MODE){liveAI.enabled=false;feed('🛠️ SAFE MODE：高度AIイベントを停止')}
}
bootGame();applyQuality();
const clock=new THREE.Clock();
function loop(){
 let dt=Math.min(.033,clock.getDelta());
 if(hitStop>0){hitStop-=dt;requestAnimationFrame(loop);return;}attackCD=Math.max(0,attackCD-dt);skillCD=Math.max(0,skillCD-dt);dodgeTime=Math.max(0,dodgeTime-dt);parry=Math.max(0,parry-dt);comboTimer-=dt;if(comboTimer<=0)combo=0;
 state.st=Math.min(state.maxSt,state.st+22*jobs[jobKey].st*dt);state.mp=Math.min(state.maxMp,state.mp+2*jobs[jobKey].mp*dt);worldTime=(worldTime+dt*4)%1440;
 adaptAI();
 state.afterimageTime=Math.max(0,(state.afterimageTime||0)-dt);
 SELF_HEAL.run('unique-skills',()=>evaluateUniqueSkills());
 SELF_HEAL.run('personal-world',()=>{worldPersonalDecision();updateAIQuests();evolveUniqueSkills();});
 SELF_HEAL.run('nemesis',()=>maybeSpawnNemesis());
 SELF_HEAL.run('projectiles',()=>updateProjectiles(dt));
 SELF_HEAL.run('objective',()=>updateObjective());
 PERF.tick();
 SELF_HEAL.run('story',()=>updatePersonalStory());
 if(!SAFE_MODE)SELF_HEAL.run('live-ai',()=>liveAIDecision());
 if(state.statusTime>0){
   state.statusTime-=dt;
   if(state.status==='burn')state.hp-=2*dt;
   if(state.statusTime<=0)state.status=null;
 }
 if(worldEvent.active){worldEvent.time-=dt;if(worldEvent.time<=0)worldEvent.active=false}
 else if(!SAFE_MODE&&Math.random()<dt*.002)SELF_HEAL.run('world-event',()=>spawnWorldEvent());
 if(kills>0 && kills%12===0 && state.dungeonFloor<100){state.dungeonFloor=Math.min(100,state.dungeonFloor+1)}weatherT-=dt;if(weatherT<=0){weatherT=25+Math.random()*25;weather=['clear','clear','rain','fog'][Math.floor(Math.random()*4)]}
 currentYaw+=(targetYaw-currentYaw)*.12;currentPitch+=(targetPitch-currentPitch)*.12;
 const camF=new THREE.Vector3();camera.getWorldDirection(camF);camF.y=0;camF.normalize();const camR=new THREE.Vector3(camF.z,0,-camF.x);
 if(Math.hypot(joy.x,joy.y)>.05){const dir=camF.multiplyScalar(-joy.y).add(camR.multiplyScalar(-joy.x)).normalize();player.position.addScaledVector(dir,4.8*(state.status==='slow'?.65:1)*(state.afterimageTime>0?1.35:1)*dt);player.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI}
 const px=Math.round(player.position.x),pz=Math.round(player.position.z),gy=heightAt(px,pz)+1.05;player.position.y+=(gy-player.position.y)*Math.min(1,dt*8);
 const horiz=Math.cos(currentPitch)*8.5,height=Math.sin(currentPitch)*8.5+1.8,off=new THREE.Vector3(Math.sin(currentYaw)*horiz,height,Math.cos(currentYaw)*horiz);camera.position.lerp(player.position.clone().add(off),.14);
 if(cameraShake>0){camera.position.x+=(Math.random()-.5)*cameraShake;camera.position.y+=(Math.random()-.5)*cameraShake;cameraShake=Math.max(0,cameraShake-dt*.9)}
 camera.lookAt(player.position.x,player.position.y+1.2,player.position.z);
 SELF_HEAL.run('hero-animation',()=>animateHumanoid(hero,Math.hypot(joy.x,joy.y)>.05,dt));
 SELF_HEAL.run('hero-detail-animation',()=>updateHeroAnimation(dt));
 SELF_HEAL.run('chunks',()=>updateChunks());
 const pulse=0.86+Math.sin(performance.now()/180)*0.08;
 facingArrow.material.opacity=0.78+Math.sin(performance.now()/220)*0.12;
 frontGlow.scale.setScalar(pulse);
 ring.material.opacity=0.32+Math.sin(performance.now()/260)*0.10;
 SELF_HEAL.run('enemies',()=>updateEnemies(dt));
 SELF_HEAL.run('allies',()=>updateAllies(dt));
 if(!SAFE_MODE)SELF_HEAL.run('fake-players',()=>updateFake(dt));
 SELF_HEAL.run('unique-boss',()=>checkUnique());
 SELF_HEAL.run('zone-banner',()=>updateZoneBanner());
 SELF_HEAL.run('hud',()=>hud());
 SELF_HEAL.run('minimap',()=>miniDraw());
 SELF_HEAL.run('ai-status',()=>{document.getElementById('liveAIStatus').innerHTML=liveAIStatusText()});
 const hour=worldTime/60,night=hour<6||hour>19;scene.background.set(night?0x10182a:weather==='rain'?0x728699:personalWorld.worldTheme==='mystery'?0x7296a8:0x7fb6de);
 if(weather==='rain'&&Math.random()<dt*.04)AUDIO.tone(90+Math.random()*30,.03,'sine',.008);scene.fog.density=weather==='fog'?.025:weather==='rain'?.018:personalWorld.worldTheme==='mystery'?.016:.012;hemi.intensity=night?.45:1.2;sun.intensity=night?.2:2.7;
 for(const e of enemies){if(e.obj)e.obj.visible=e.alive&&dist(player.position,e.obj.position)<(SAFE_MODE?32:55)}
 for(const f of fakePlayers){f.obj.visible=!SAFE_MODE&&dist(player.position,f.obj.position)<45}
 SELF_HEAL.run('renderer',()=>renderer.render(scene,camera));requestAnimationFrame(loop);
}
loop();

window.saveGame=()=>{localStorage.setItem('yuusha_v14_stable',JSON.stringify({state,mats,inventory,quests,kills,mined,fished,weaponKey,skillState,jobKey,equippedSet,baseCamp,adaptiveAI,discoveredItems:[...discoveredItems],ownedCounts,forgeLevels,aiProfile,uniqueSkills,liveAI,evolvedJob,personalWorld:{...personalWorld,unlockedZones:[...personalWorld.unlockedZones]},originProfile,evolvedUniqueSkills,personalStory,nemesis:{...nemesis,enemy:null},pos:{x:player.position.x,y:player.position.y,z:player.position.z},enemies:enemies.map(e=>({hp:e.hp,alive:e.alive,phase:e.phase}))}));msg('💾 セーブ')};
window.loadGame=()=>{
 const raw=localStorage.getItem('yuusha_v18_autosave')||localStorage.getItem('yuusha_v14_stable')||localStorage.getItem('yuusha_v13_5_live_ai')||localStorage.getItem('yuusha_v13_4_live_ai')||localStorage.getItem('yuusha_v13_3_live_ai')||localStorage.getItem('yuusha_v13_2_live_ai')||localStorage.getItem('yuusha_v13_live_ai')||localStorage.getItem('yuusha_v11_2_items')||localStorage.getItem('yuusha_v11_max')||localStorage.getItem('yuusha_v10_voxel');
 if(!raw)return msg('📂 セーブなし');
 try{
  const d=JSON.parse(raw);if(!d||typeof d!=='object')throw new Error('セーブ形式不正');
  Object.assign(state,d.state&&typeof d.state==='object'?d.state:{});
  Object.assign(mats,d.mats&&typeof d.mats==='object'?d.mats:{});
  inventory=Array.isArray(d.inventory)?d.inventory:[];
  Object.assign(quests,d.quests&&typeof d.quests==='object'?d.quests:{});
  kills=Number.isFinite(d.kills)?d.kills:0;mined=Number.isFinite(d.mined)?d.mined:0;fished=Number.isFinite(d.fished)?d.fished:0;
  Object.assign(skillState,d.skillState&&typeof d.skillState==='object'?d.skillState:{});
  jobKey=jobs[d.jobKey]?d.jobKey:'adventurer';
  if(d.equippedSet&&typeof d.equippedSet==='object')Object.assign(equippedSet,d.equippedSet);
  Object.assign(adaptiveAI,d.adaptiveAI&&typeof d.adaptiveAI==='object'?d.adaptiveAI:{});
  (Array.isArray(d.discoveredItems)?d.discoveredItems:[]).forEach(x=>discoveredItems.add(x));
  Object.assign(ownedCounts,d.ownedCounts&&typeof d.ownedCounts==='object'?d.ownedCounts:{});
  Object.assign(forgeLevels,d.forgeLevels&&typeof d.forgeLevels==='object'?d.forgeLevels:{});
  Object.assign(aiProfile,d.aiProfile&&typeof d.aiProfile==='object'?d.aiProfile:{});
  Object.assign(uniqueSkills,d.uniqueSkills&&typeof d.uniqueSkills==='object'?d.uniqueSkills:{});
  Object.assign(liveAI,d.liveAI&&typeof d.liveAI==='object'?d.liveAI:{});
  evolvedJob=d.evolvedJob||null;
  if(d.personalWorld&&typeof d.personalWorld==='object'){
    Object.assign(personalWorld,d.personalWorld);
    personalWorld.unlockedZones=new Set(Array.isArray(d.personalWorld.unlockedZones)?d.personalWorld.unlockedZones:['plains']);
  }
  if(d.originProfile&&typeof d.originProfile==='object')Object.assign(originProfile,d.originProfile);
  if(d.evolvedUniqueSkills&&typeof d.evolvedUniqueSkills==='object')Object.assign(evolvedUniqueSkills,d.evolvedUniqueSkills);
  if(d.personalStory&&typeof d.personalStory==='object')Object.assign(personalStory,d.personalStory);
  if(d.nemesis&&typeof d.nemesis==='object'){Object.assign(nemesis,d.nemesis);nemesis.enemy=null;nemesis.active=false;}
  if(d.checkpoint&&typeof d.checkpoint==='object'){Object.assign(CHECKPOINT,d.checkpoint);document.getElementById('checkpointChip').textContent='📍 '+CHECKPOINT.name;}


  SELF_HEAL.run('load-equip',()=>equipWeapon(weapons[d.weaponKey]?d.weaponKey:'sword'));
  if(d.pos&&[d.pos.x,d.pos.y,d.pos.z].every(Number.isFinite))player.position.set(d.pos.x,d.pos.y,d.pos.z);
  if(Array.isArray(d.enemies))d.enemies.forEach((v,i)=>{if(enemies[i]&&v){enemies[i].hp=Number.isFinite(v.hp)?v.hp:enemies[i].maxHp;enemies[i].alive=!!v.alive;enemies[i].phase=v.phase||1;enemies[i].obj.visible=enemies[i].alive}});
  SELF_HEAL.run('menus',()=>refreshMenus());msg('📂 ロード');
 }catch(e){SELF_HEAL.record('save-load',e);try{localStorage.setItem('yuusha_v14_bad_save_backup',raw)}catch(_){};msg('🛠️ 壊れたセーブを隔離しました')}
};

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
setTimeout(()=>{feed('✅ REAL v19：PROJECT FREE 起動');msg('☰ メニューから詳細機能を開けます')},900);
setTimeout(()=>feed('🌐 ワールドログ：禁足山岳で未知のボス反応'),1400);
setTimeout(()=>feed('💬 Raven：古代森林の地下、掘れるらしいぞ'),2200);