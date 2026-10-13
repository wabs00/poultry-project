"""Local preview integration checks. Adds synthetic QA records, never use on a real farm."""
import urllib.request, urllib.error, http.cookiejar, json, concurrent.futures, datetime, uuid
BASE='http://127.0.0.1:8030'
jar=http.cookiejar.CookieJar()
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
checks=0
def request(path='/api/workspace',body=None,expected=200,headers=None,anonymous=False):
    global checks
    h={'Content-Type':'application/json',**(headers or {})}
    req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers=h)
    try:
        response=(urllib.request.urlopen(req) if anonymous else client.open(req))
        status=response.status; data=response.read()
    except urllib.error.HTTPError as e: status=e.code;data=e.read()
    assert status==expected,(status,data[:200])
    checks+=1
    try:return json.loads(data) if data else None
    except json.JSONDecodeError:
        assert status>=400
        return None
request(expected=401,anonymous=True)
request(body={'revision':0,'kind':'stock','values':{'name':'Unauthorized','threshold':0}},expected=401,anonymous=True)
client.open(BASE+'/signin-with-chatgpt?return_to=/').read()
current=request();revision=current['revision']
def save(kind,values,expected=200):
    global revision,current
    result=request(body={'kind':kind,'values':values,'revision':revision},expected=expected)
    if expected==200:current=result;revision=result['revision']
    return result
suffix=uuid.uuid4().hex[:6];date=datetime.date.today().isoformat()
save('stock',{'name':'QA feed '+suffix,'threshold':10});item=current['farm']['stock'][-1]['id']
save('receipt',{'itemId':item,'date':date,'quantity':100,'supplier':'Synthetic QA'})
save('flock',{'name':'QA flock '+suffix,'house':'QA','species':'Chicken','type':'Layer','placed':date,'birds':10,'feedId':item});flock=current['farm']['flocks'][-1]['id']
record={'flockId':flock,'date':date,'eggs':8,'feed':5,'water':10,'deaths':1,'weight':1.8,'notes':'Synthetic QA'}
save('daily',record);daily=current['farm']['daily'][-1]['id']
save('daily',record,422)
save('dailyEdit',{**record,'id':daily,'feed':101},422)
save('dailyEdit',{**record,'id':daily,'feed':6})
save('sale',{'flockId':flock,'date':date,'product':'Eggs','quantity':9,'amount':20,'paid':0,'customer':'QA'},422)
save('sale',{'flockId':flock,'date':date,'product':'Eggs','quantity':4,'amount':20,'paid':5,'customer':'QA'});sale=current['farm']['sales'][-1]['id']
save('payment',{'id':sale,'amount':16},422)
save('payment',{'id':sale,'amount':15})
save('dailyEdit',{**record,'id':daily,'eggs':3},422)
save('expense',{'date':date,'category':'Other','amount':2.99,'notes':'QA'})
save('task',{'title':'QA task '+suffix,'date':date,'assignee':'Test'});task=current['farm']['tasks'][-1]['id']
save('taskToggle',{'id':task})
save('health',{'flockId':flock,'date':date,'title':'QA review','notes':'Test'});health=current['farm']['health'][-1]['id']
save('healthToggle',{'id':health})
save('demo',{},422)
request(body=None,expected=200)
request(body={},expected=400)
request(body=[],expected=400)
request(body={'kind':'task','values':[],'revision':revision},expected=400)
request(body={'kind':'task','values':{},'revision':-1},expected=400)
request(body={'kind':'task','values':{'title':'x'*21000},'revision':revision},expected=413)
request(body={'kind':'task','values':{},'revision':revision},headers={'Origin':'https://untrusted.test'},expected=403)
request(body={'kind':'task','values':{},'revision':0},expected=409)
events=request('/api/workspace?audit=1')['events'];assert events[0]['revision']==revision
# Simultaneous writers start from the same version: exactly one must win.
cookie='; '.join(c.name+'='+c.value for c in jar)
def concurrent_save(i):
    req=urllib.request.Request(BASE+'/api/workspace',data=json.dumps({'revision':revision,'kind':'task','values':{'title':f'QA race {suffix} {i}','date':date,'assignee':''}}).encode(),headers={'Content-Type':'application/json','Cookie':cookie})
    try:return urllib.request.urlopen(req).status
    except urllib.error.HTTPError as e:return e.code
with concurrent.futures.ThreadPoolExecutor(2) as pool: outcomes=list(pool.map(concurrent_save,[1,2]))
assert sorted(outcomes)==[200,409],outcomes
checks+=2
latest=request();assert latest['revision']==revision+1
print(f'{checks} HTTP checks passed; concurrent-write outcomes {outcomes}.')
