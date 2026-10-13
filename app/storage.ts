import type {Farm} from './core';
// Guard stored snapshots before returning them to the client or applying commands.
export function parseStoredFarm(payload:string):Farm {
  const farm=JSON.parse(payload);
  const fail=()=>{throw Error('Stored farm snapshot is invalid.');};
  if(!farm||typeof farm!=='object'||Array.isArray(farm)||typeof farm.name!=='string'||!farm.name.trim()||!['GHS','USD','EUR','GBP','NGN','KES'].includes(farm.currency))fail();
  const fields:Record<string,Record<string,string>>={
    flocks:{id:'string',name:'string',house:'string',type:'string',species:'string',placed:'date',birds:'integer',feedId:'string'},
    stock:{id:'string',name:'string',threshold:'number'},receipts:{id:'string',itemId:'string',date:'date',quantity:'number',supplier:'string'},
    daily:{id:'string',flockId:'string',date:'date',eggs:'integer',feed:'number',water:'number',deaths:'integer',weight:'number',notes:'string'},
    health:{id:'string',flockId:'string',date:'date',title:'string',notes:'string',done:'boolean'},tasks:{id:'string',title:'string',date:'date',assignee:'string',done:'boolean'},
    sales:{id:'string',flockId:'string',date:'date',product:'string',quantity:'integer',amount:'integer',customer:'string',paid:'integer'},
    expenses:{id:'string',date:'date',category:'string',amount:'integer',notes:'string'},
  };
  for(const [table,schema] of Object.entries(fields)){
    const rows=farm[table];if(!Array.isArray(rows))fail();const ids=new Set<string>();
    for(const row of rows){
      if(!row||typeof row!=='object'||Array.isArray(row))fail();
      for(const [key,type] of Object.entries(schema)){
        const value=row[key];
        if(type==='integer'||type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||(type==='integer'&&!Number.isInteger(value)))fail();}
        else if(type==='date'){const parsed=new Date(value+'T00:00:00Z');if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)fail();}
        else if(typeof value!==type)fail();
      }
      if(!row.id||ids.has(row.id))fail();ids.add(row.id);
    }
  }
  const flockIds=new Set(farm.flocks.map((x:{id:string})=>x.id)),stockIds=new Set(farm.stock.map((x:{id:string})=>x.id));
  for(const b of farm.flocks)if(!stockIds.has(b.feedId)||!['Layer','Broiler'].includes(b.type)||b.birds<1)fail();
  for(const r of farm.receipts)if(!stockIds.has(r.itemId))fail();
  for(const r of [...farm.daily,...farm.health,...farm.sales])if(!flockIds.has(r.flockId))fail();
  for(const s of farm.sales)if(!['Eggs','Birds'].includes(s.product)||s.paid>s.amount||s.quantity<1)fail();
  return farm as Farm;
}
