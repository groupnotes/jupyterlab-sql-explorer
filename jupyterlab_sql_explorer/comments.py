import os
from . import comments_db
from .const import DB_ROOT

#
# comments_store : None / database / server
#
comments_store = None

def init(store_str):
    global comments_store
    print(store_str)
    arr=store_str.split("::")
    if arr[0]=='database':
        comments_db.init(arr[1])
        comments_store=arr[0]
    else:
        comments_store=None

def add(data):
    if comments_store is None:
        return "can't set comment, please set comment store first!"
    elif comments_store == 'database':
        comments_db.set_comments(**data)
    elif comments_store == 'server':
        pass
    return "set comment ok"

def match_column(dbid: str, schema: str, table: str, columns: list)->list:
    if comments_store is None:
        return columns
    elif comments_store == 'database':
        clist = comments_db.get_column_comments(dbid, schema, table)
    elif comments_store == 'server':
        pass

    for r in columns:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return columns

def match_table(dbid: str, schema: str, tables: list)->list:
    if comments_store is None:
        return tables
    elif comments_store == 'database':
        clist = comments_db.get_table_comments(dbid, schema)
    elif comments_store == 'server':
        pass

    for r in tables:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return tables

def match_schema(dbid: str, schemas: list)->list:
    if comments_store is None:
        return schemas
    elif comments_store == 'database':
        clist = comments_db.get_schema_comments(dbid)
    elif comments_store == 'server':
        pass

    for r in schemas:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return schemas

def match_conn(conns: list)->list:
    if comments_store is None:
        return conns
    elif comments_store == 'database':
        clist = comments_db.get_conn_comments()
    elif comments_store == 'server':
        pass

    for r in conns:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return conns