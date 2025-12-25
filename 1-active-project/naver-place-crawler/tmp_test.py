import collect_master_data as cm
places = cm.fetch_top_places("카페", 1)
print(places)
print([hex(ord(c)) for c in places[0]['name'][:3]])
