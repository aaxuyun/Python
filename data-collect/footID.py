#coding=utf-8

import urllib2
import re


listID=[]
for i in range(1,60):
    headers = {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'}
    req = urllib2.Request(url="http://www.foooooot.com/search/trip/all/1/all/time/descent/?page="+str(i)+"&keyword=%E9%A2%90%E5%92%8C%E5%9B%AD", headers=headers)
    data=urllib2.urlopen(req).read()
    patUrl='<a target="_blank" href="/trip/(\d+)/">'
    footId=re.compile(patUrl).findall(str(data))
    listID.extend(footId)
print(listID)

