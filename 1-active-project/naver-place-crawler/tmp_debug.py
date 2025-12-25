import requests,re
kw='헬스장'
h={'User-Agent':'Mozilla/5.0','Accept':'text/html','Referer':'https://www.naver.com/'}
url='https://search.naver.com/search.naver'
params={'query':kw,'sm':'top_hty','fbm':1}
r=requests.get(url,params=params,headers=h,timeout=10)
html=r.text
names=re.findall(r"\"name\":\"([^\\\"]+)\"", html)
cats=re.findall(r"\"category\":\"([^\\\"]+)\"", html)
print('len',len(names),len(cats))
print(names[:5])
print(cats[:5])
