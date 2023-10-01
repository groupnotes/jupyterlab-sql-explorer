import os
from . import comments_db
from .const import DB_ROOT

#
# comment_source : None / database / server
#
comment_source = 'database'

def init():
    global comment_source
    comment_source = 'database'
    comments_file_path = os.path.expanduser(DB_ROOT+ 'comments.db')
    comments_db.init("sqlite:///"+comments_file_path)

def add(data):
    if comment_source is None:
        return "can't set comment, please set comment store first!"
    elif comment_source == 'database':
        comments_db.set_comments(**data)
    elif comment_source == 'server':
        pass
    return "set comment ok"

def match_column(dbid: str, schema: str, table: str, columns: list)->list:
    if comment_source is None:
        return columns
    elif comment_source == 'database':
        clist = comments_db.get_column_comments(dbid, schema, table)
    elif comment_source == 'server':
        pass

    for r in columns:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return columns


def match_table(dbid: str, schema: str, tables: list)->list:
    if comment_source is None:
        return tables
    elif comment_source == 'database':
        clist = comments_db.get_table_comments(dbid, schema)
    elif comment_source == 'server':
        pass

    for r in tables:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return tables


def match_schema(dbid: str, schemas: list)->list:
    if comment_source is None:
        return schemas
    elif comment_source == 'database':
        clist = comments_db.get_schema_comments(dbid)
    elif comment_source == 'server':
        pass

    for r in schemas:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return schemas

def match_conn(conns: list)->list:
    if comment_source is None:
        return conns
    elif comment_source == 'database':
        clist = comments_db.get_conn_comments()
    elif comment_source == 'server':
        pass

    for r in conns:
        if r['name'] in clist:
            r['desc']=clist[r['name']]

    return conns