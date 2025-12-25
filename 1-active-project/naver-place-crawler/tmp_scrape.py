import requests,re

def fetch(keyword):
    h={'User-Agent':'Mozilla/5.0','Accept':'text/html','Referer':'https://www.naver.com/'}
    url='https://search.naver.com/search.naver'
    params={'query':keyword,'sm':'top_hty','fbm':1}
    r=requests.get(url,params=params,headers=h,timeout=10)
    html=r.text
    names=re.findall(r"\"name\":\"([^\\\"]+)\"", html)
    cats=re.findall(r"\"category\":\"([^\\\"]+)\"", html)
    print(keyword, len(names), names[:5], cats[:5])

for kw in ['카페','맛집','헬스장']:
    fetch(kw)
