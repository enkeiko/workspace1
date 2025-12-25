lines=open("init_master_data.sql","r",encoding="utf-8").read().splitlines()
for l in lines[-10:]:
    print(l.encode("unicode_escape").decode())
