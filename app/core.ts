export type Flock = {id:string;name:string;house:string;type:'Layer'|'Broiler';species:string;placed:string;birds:number;feedId:string};
export type Stock = {id:string;name:string;threshold:number};
export type Receipt = {id:string;itemId:string;date:string;quantity:number;supplier:string};
export type Daily = {id:string;flockId:string;date:string;eggs:number;feed:number;water:number;deaths:number;weight:number;notes:string};
export type Health = {id:string;flockId:string;date:string;title:string;notes:string;done:boolean};
export type Task = {id:string;title:string;date:string;assignee:string;done:boolean};
export type Sale = {id:string;flockId:string;date:string;product:'Eggs'|'Birds';quantity:number;amount:number;customer:string;paid:number};
export type Expense = {id:string;date:string;category:string;amount:number;notes:string};
export type Farm = {name:string;currency:string;flocks:Flock[];stock:Stock[];receipts:Receipt[];daily:Daily[];health:Health[];tasks:Task[];sales:Sale[];expenses:Expense[]};
export type Command = {kind:string;values:Record<string,unknown>};
export const emptyFarm = ():Farm => ({name:'Your poultry farm',currency:'GHS',flocks:[],stock:[],receipts:[],daily:[],health:[],tasks:[],sales:[],expenses:[]});
export const today = () => new Date().toISOString().slice(0,10);
function str(v:unknown,max=200,required=true){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('Please complete the required text fields.');return v.trim();}
function num(v:unknown,min=0,max=1e8,integer=false){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error('A quantity or amount is outside the allowed range.');return v;}
function date(v:unknown){const s=str(v,10),parsed=new Date(s+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==s)throw Error('Choose a valid date.');return s;}
function money(v:unknown){const n=num(v,0,1e9);if(Math.abs(n*100-Math.round(n*100))>1e-6)throw Error('Amounts support at most two decimal places.');return Math.round(n*100);}
function getFlock(f:Farm,id:unknown){const found=f.flocks.find(x=>x.id===id);if(!found)throw Error('Select an existing flock.');return found;}
export function birds(f:Farm,flockId:string,asOf='9999-12-31'){const flock=f.flocks.find(x=>x.id===flockId);if(!flock||flock.placed>asOf)return 0;return flock.birds-f.daily.filter(x=>x.flockId===flockId&&x.date<=asOf).reduce((s,x)=>s+x.deaths,0)-f.sales.filter(x=>x.flockId===flockId&&x.product==='Birds'&&x.date<=asOf).reduce((s,x)=>s+x.quantity,0);}
export function feedBalance(f:Farm,id:string,asOf='9999-12-31'){return f.receipts.filter(x=>x.itemId===id&&x.date<=asOf).reduce((s,x)=>s+x.quantity,0)-f.daily.filter(x=>x.date<=asOf&&f.flocks.find(b=>b.id===x.flockId)?.feedId===id).reduce((s,x)=>s+x.feed,0);}
export function eggs(f:Farm,flockId:string,asOf='9999-12-31'){return f.daily.filter(x=>x.flockId===flockId&&x.date<=asOf).reduce((s,x)=>s+x.eggs,0)-f.sales.filter(x=>x.flockId===flockId&&x.product==='Eggs'&&x.date<=asOf).reduce((s,x)=>s+x.quantity,0);}
export function openingBirds(f:Farm,flockId:string,onDate:string){const b=f.flocks.find(x=>x.id===flockId);if(!b||b.placed>onDate)return 0;return b.birds-f.daily.filter(x=>x.flockId===flockId&&x.date<onDate).reduce((s,x)=>s+x.deaths,0)-f.sales.filter(x=>x.flockId===flockId&&x.product==='Birds'&&x.date<onDate).reduce((s,x)=>s+x.quantity,0);}
function validateBalances(f:Farm){
  type Day={placed:Flock[];receipts:Receipt[];daily:Daily[];sales:Sale[]};
  const days=new Map<string,Day>();
  const day=(date:string)=>{if(!days.has(date))days.set(date,{placed:[],receipts:[],daily:[],sales:[]});return days.get(date)!;};
  for(const b of f.flocks)day(b.placed).placed.push(b);
  for(const r of f.receipts)day(r.date).receipts.push(r);
  for(const r of f.daily)day(r.date).daily.push(r);
  for(const r of f.sales)day(r.date).sales.push(r);
  const birdCounts=new Map<string,number>(),eggCounts=new Map<string,number>(),feedCounts=new Map<string,number>(),flocks=new Map(f.flocks.map(b=>[b.id,b]));
  const add=(map:Map<string,number>,id:string,n:number)=>map.set(id,(map.get(id)??0)+n);
  for(const date of [...days.keys()].sort()){
    const d=days.get(date)!;
    for(const b of d.placed)add(birdCounts,b.id,b.birds);
    for(const r of d.receipts)add(feedCounts,r.itemId,r.quantity);
    for(const r of d.daily){if((birdCounts.get(r.flockId)??0)<=0&&(r.eggs||r.feed||r.water||r.weight||r.deaths))throw Error('Production cannot be recorded when the flock has no live birds at the start of that day.');add(birdCounts,r.flockId,-r.deaths);add(eggCounts,r.flockId,r.eggs);add(feedCounts,flocks.get(r.flockId)!.feedId,-r.feed);}
    for(const s of d.sales){if(s.product==='Birds')add(birdCounts,s.flockId,-s.quantity);else add(eggCounts,s.flockId,-s.quantity);}
    for(const n of birdCounts.values())if(n<0)throw Error('This entry would make the bird balance negative.');
    for(const n of eggCounts.values())if(n<0)throw Error('Not enough recorded eggs for this sale on that date.');
    for(const n of feedCounts.values())if(n<-1e-6)throw Error('Not enough feed stock. Record a receipt before using this feed.');
  }
}
export function applyCommand(original:Farm,cmd:Command):Farm {
  const f=structuredClone(original),v=cmd.values,id=crypto.randomUUID();
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid entry.');
  const total=f.flocks.length+f.stock.length+f.receipts.length+f.daily.length+f.health.length+f.tasks.length+f.sales.length+f.expenses.length;
  if(total>=5000&& !['settings','taskToggle','healthToggle','payment','dailyEdit'].includes(cmd.kind))throw Error('This workspace has reached its 5,000 record limit. Export records and contact support before expanding.');
  switch(cmd.kind){
    case 'settings':f.name=str(v.name,100);f.currency=str(v.currency,3);if(!['GHS','USD','EUR','GBP','NGN','KES'].includes(f.currency))throw Error('Select a supported currency.');if(f.currency!==original.currency&&(f.sales.length||f.expenses.length))throw Error('Currency cannot change after monetary records exist.');break;
    case 'stock':{const name=str(v.name,100);if(f.stock.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw Error('This feed item already exists.');f.stock.push({id,name,threshold:num(v.threshold)});break;}
    case 'receipt':{const itemId=str(v.itemId);if(!f.stock.some(x=>x.id===itemId))throw Error('Select an existing feed item.');const d=date(v.date);if(d>today())throw Error('Receipts cannot be in the future.');f.receipts.push({id,itemId,date:d,quantity:num(v.quantity,.01),supplier:str(v.supplier,100,false)});break;}
    case 'flock':{const name=str(v.name,100),feedId=str(v.feedId);if(f.flocks.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw Error('This flock name already exists.');if(!f.stock.some(x=>x.id===feedId))throw Error('Create and select a feed item first.');if(!['Layer','Broiler'].includes(String(v.type)))throw Error('Select a flock type.');const placed=date(v.placed);if(placed>today())throw Error('Placement cannot be in the future.');f.flocks.push({id,name,house:str(v.house,100),type:v.type as Flock['type'],species:str(v.species,50),placed,birds:num(v.birds,1,1e7,true),feedId});break;}
    case 'dailyEdit':
    case 'daily':{let recordId=id;if(cmd.kind==='dailyEdit'){const existing=f.daily.find(x=>x.id===v.id);if(!existing)throw Error('Record no longer exists.');recordId=existing.id;f.daily=f.daily.filter(x=>x.id!==existing.id);}const b=getFlock(f,v.flockId),d=date(v.date);if(d>today()||d<b.placed)throw Error('Production date must be between placement and today.');if(f.daily.some(x=>x.flockId===b.id&&x.date===d))throw Error('This flock already has a record for that day.');const e=num(v.eggs,0,1e7,true);if(b.type==='Broiler'&&e>0)throw Error('Broiler records cannot contain eggs.');f.daily.push({id:recordId,flockId:b.id,date:d,eggs:e,feed:num(v.feed),water:num(v.water),deaths:num(v.deaths,0,1e7,true),weight:num(v.weight,0,100),notes:str(v.notes,2000,false)});break;}
    case 'health':{const b=getFlock(f,v.flockId),d=date(v.date);if(d<b.placed)throw Error('Health activity cannot be dated before flock placement.');f.health.push({id,flockId:b.id,date:d,title:str(v.title,120),notes:str(v.notes,2000,false),done:false});break;}
    case 'task':f.tasks.push({id,title:str(v.title,120),date:date(v.date),assignee:str(v.assignee,100,false),done:false});break;
    case 'taskToggle':{const task=f.tasks.find(x=>x.id===v.id);if(!task)throw Error('Task no longer exists.');task.done=!task.done;break;}
    case 'healthToggle':{const event=f.health.find(x=>x.id===v.id);if(!event)throw Error('Health record no longer exists.');event.done=!event.done;break;}
    case 'sale':{const b=getFlock(f,v.flockId),d=date(v.date);if(d>today()||d<b.placed)throw Error('Sale date must be between placement and today.');if(!['Eggs','Birds'].includes(String(v.product)))throw Error('Select a product.');const amount=money(v.amount),paid=money(v.paid);if(paid>amount)throw Error('Payment cannot exceed sale amount.');f.sales.push({id,flockId:b.id,date:d,product:v.product as Sale['product'],quantity:num(v.quantity,1,1e7,true),amount,paid,customer:str(v.customer,120)});break;}
    case 'payment':{const sale=f.sales.find(x=>x.id===v.id);if(!sale)throw Error('Sale no longer exists.');const paid=money(v.amount);if(paid===0||sale.paid+paid>sale.amount)throw Error('Payment must be positive and cannot exceed the outstanding balance.');sale.paid+=paid;break;}
    case 'expense':{const d=date(v.date);if(d>today())throw Error('Expense date cannot be in the future.');f.expenses.push({id,date:d,category:str(v.category,100),amount:money(v.amount),notes:str(v.notes,2000,false)});break;}
    default:throw Error('Unsupported operation.');
  }
  validateBalances(f);return f;
}
export function demoFarm():Farm {
  let f=emptyFarm();f.name='Greenfield Poultry';
  f=applyCommand(f,{kind:'stock',values:{name:'Layer mash',threshold:250}});f=applyCommand(f,{kind:'stock',values:{name:'Broiler grower',threshold:150}});
  const ago=(n:number)=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
  for(const item of f.stock)f=applyCommand(f,{kind:'receipt',values:{itemId:item.id,date:ago(14),quantity:item.name==='Layer mash'?1200:600,supplier:'Demo Feed Cooperative'}});
  for(const [i,name] of ['Amber layers 01','Broiler batch 04','Heritage layers'].entries())f=applyCommand(f,{kind:'flock',values:{name,house:'House '+(i+1),type:i===1?'Broiler':'Layer',species:'Chicken',placed:ago(40),birds:i===0?1200:i===1?600:350,feedId:f.stock[i===1?1:0].id}});
  for(let n=6;n>=0;n--)for(const [i,b] of f.flocks.entries())f=applyCommand(f,{kind:'daily',values:{flockId:b.id,date:ago(n),eggs:i===1?0:i===0?940+(6-n)*12:260+(6-n)*4,feed:i===0?120:i===1?52:34,water:i===0?240:100,deaths:n===3?1:0,weight:i===1?1.4+(6-n)*.08:1.8,notes:'Fictional demonstration record'}});
  f=applyCommand(f,{kind:'sale',values:{flockId:f.flocks[0].id,date:today(),product:'Eggs',quantity:1200,amount:2400,paid:1800,customer:'Demo Market'}});
  f=applyCommand(f,{kind:'expense',values:{date:today(),category:'Feed',amount:950,notes:'Fictional example expense'}});
  f=applyCommand(f,{kind:'task',values:{title:'Check drinker lines in House 2',date:today(),assignee:'Farm team'}});
  f=applyCommand(f,{kind:'task',values:{title:'Receive next feed delivery',date:ago(-1),assignee:'Storekeeper'}});
  f=applyCommand(f,{kind:'health',values:{flockId:f.flocks[0].id,date:ago(-2),title:'Scheduled flock health review',notes:'Confirm with your veterinary professional.'}});
  return f;
}
