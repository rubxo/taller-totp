import time
from urllib.parse import urlparse, parse_qs
import pytest
from fastapi.testclient import TestClient
from app import main as m
from app.totp import totp
c = TestClient(m.app)
v = 'a'*64
p = dict(client_id=m.CLIENT, redirect_uri='unisabana-auth://oauth/callback', response_type='code', code_challenge_method='S256', code_challenge=m.challenge(v), state='s'*43)
@pytest.fixture(autouse=True)
def reset():
    m.codes.clear(); m.refreshes.clear(); m.revoked.clear(); m.used.clear()
def get_code():
    assert c.get('/oauth/authorize',params=p).status_code == 200
    r=c.post('/oauth/authorize',data={**p,'email':m.USER,'password':'sabana2026'},follow_redirects=False)
    assert parse_qs(urlparse(r.headers['location']).query)['state']==[p['state']]
    return parse_qs(urlparse(r.headers['location']).query)['code'][0]
def exchange(code, verifier=v):
    return c.post('/auth/oauth/token',json={**p,'grant_type':'authorization_code','code':code,'code_verifier':verifier})
def auth():
    return exchange(get_code()).json()
def headers(t): return {'Authorization':'Bearer '+t}
def test_pkce_reuse_and_bad():
    code=get_code(); assert exchange(code).status_code==200; assert exchange(code).status_code==400
    assert exchange(get_code(),'b'*64).status_code==400
@pytest.mark.parametrize('change',[{'state':'bad'},{'redirect_uri':'https://evil.test'},{'code_challenge_method':'plain'},{'redirect_uri':'exp://host/--/oauth/callback?evil=1'}])
def test_invalid(change): assert c.get('/oauth/authorize',params={**p,**change}).status_code==400
def test_rotation():
    s=auth(); r=c.post('/auth/refresh',json=s); assert r.status_code==200
    assert c.post('/auth/refresh',json=s).status_code==401
    assert c.post('/auth/refresh',json=r.json()).status_code==401
@pytest.mark.parametrize('offset',[-1,0,1])
def test_step_up(offset):
    s=auth(); h=headers(s['access_token']); assert c.get('/api/perfil',headers=h).status_code==200
    r=c.get('/api/boveda-critica',headers=h); assert r.status_code==403
    data={'step_up_token':r.json()['step_up_token'],'code':totp(m.SECRET,int(time.time()//30)+offset)}
    assert c.post('/auth/mfa/verify',json={**data,'code':'bad'}).status_code==401
    verified=c.post('/auth/mfa/verify',json=data); assert verified.status_code==200
    assert c.get('/api/boveda-critica',headers=headers(verified.json()['elevated_token'])).status_code==200
    replay=c.post('/auth/mfa/verify',json=data); assert replay.status_code==409; assert replay.json()['detail']=='Replay Attack Detected'
    assert c.get('/api/boveda-critica',headers=headers(m.token('elevated',True,-1))).status_code==401
def test_enroll(): assert '<svg' in c.get('/mfa/enroll').text
