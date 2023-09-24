from . import engine
from .serializer import make_row_serializable

log=None
def set_log(_log):
    global log
    log = _log

def query(dbid, sql, **kwargs) ->list:
    '''
    make a query.
    '''
    usedb=None
    if 'db' in kwargs:
        usedb=kwargs['db']
    eng = engine.getEngine(dbid, usedb)
    if eng:
        conn = eng.connect()
        result = conn.execute(sql)
        data = result.fetchall()
        conn.close()
        return data

    return []

def query_header(dbid, sql, **kwargs) ->dict:
    '''
    make a query, return with header
    '''

#     if 'LIMIT' in sql.upper():
#         import re
#         limit_pattern = re.compile(r'(LIMIT\s+(\d+))', flags=re.IGNORECASE)
#         match = limit_pattern.search(sql)

#         if match:
#             existing_limit = int(match.group(2))
#             if existing_limit >= 1000:
#                 sql_with_limit = sql
#             else:
#                 sql_with_limit = limit_pattern.sub('LIMIT 200 ', sql)
#         else:
#             sql_with_limit = f"{sql} LIMIT 200"
#     else:
#         sql_with_limit = f"{sql} LIMIT 200"

    # global log
    # for i in range(30):
    #     time.sleep(1)
    #     log.error(i)

    usedb=None
    if 'db' in kwargs:
        usedb=kwargs['db']
    eng = engine.getEngine(dbid, usedb)
    if eng:
        result = eng.execute(sql)
        if result.returns_rows:
            data = [make_row_serializable(row) for row in result]
            columns = list(result.keys())
            return {'columns': columns, 'data': data}
    return {}

def get_column_info(dbid, db, tbl):
    '''
    '''
    print(dbid, db, tbl)
    dbinfo = engine._getDbInfo(dbid)
    if dbinfo is None:
        return

    columns=[]
    eng=engine.getEngine(dbid, db)
    if eng:
        if dbinfo['db_type'] ==engine.DB_SQLITE:
            for r in query(dbid, f"PRAGMA table_info('{tbl}')"):
                columns.append({'name': r[1], 'desc': r[2], 'type': 'col'})
        elif dbinfo['db_type'] ==engine.DB_MYSQL:
            for r in query(dbid, f"SELECT column_name, column_comment FROM information_schema.columns WHERE table_name = '{tbl}' AND table_schema = '{db}'"):
                columns.append({'name': r[0], 'desc': r[1], 'type': 'col'})
        elif dbinfo['db_type'] ==engine.DB_PGSQL:
            for r in query(dbid, '''
                SELECT column_name, data_type, col_description(
                    (select '%s.%s'::regclass::oid), ordinal_position) as comment
                FROM information_schema.columns c
                JOIN pg_class ON c.table_name::regclass = pg_class.oid
                WHERE  table_schema='%s' and table_name='%s'
                ORDER BY ordinal_position
            ''' %(db, tbl, db, tbl)):
                columns.append({'name': r[0], 'desc': r[2], 'type': 'col'})
        elif dbinfo['db_type'] ==engine.DB_ORACLE:
            for r in query(dbid, f"SELECT column_name, comments FROM all_col_comments WHERE table_name = '${tbl}'"):
                print(r)
                columns.append({'name': r[0], 'desc': '', 'type': 'col'})
        elif dbinfo['db_type'] ==engine.DB_HIVE_LDAP or dbinfo['db_type'] ==engine.DB_HIVE_KERBEROS:
            cols={}
            pk=False
            for r in query(dbid, f"DESCRIBE {tbl}", db=db):
                if r['col_name']=='':
                    continue
                if r['col_name'][0]=='#':
                    if r['col_name']=='# Partition Information':
                        pk=True
                    continue
                if pk is False:
                    cols[r['col_name']]={'name': r['col_name'], 'desc': r['comment'], 'type': 'col'}
                else:
                    cols[r['col_name']]={'name': r['col_name'], 'desc': r['comment'], 'type': 'col', 'stype': 'parkey'}
            columns=list(cols.values())
    return columns

def get_db_or_table(dbid, database):
    '''
    Obtain the database or table (if there is no database layer) of a specified database 
    connection
    '''
    dbinfo = engine._getDbInfo(dbid)
    if dbinfo is None:
        return None

    if dbinfo['db_type'] ==engine.DB_SQLITE:
        tables=[]
        for r in query(dbid, "SELECT name FROM sqlite_master WHERE type='table'"):
            tables.append({'name': r[0], 'desc': '', 'type': 'table'})
        return tables
    elif dbinfo['db_type'] ==engine.DB_PGSQL:
        if database is None:
            databases=[]
            for r in query(dbid, "select schema_name from information_schema.schemata where schema_name='public' or schema_owner!='gpadmin'"):
                databases.append({'name': r[0], 'desc': '', 'type': 'db'})
            return databases
        else:
            tables=[]
            for r in query(dbid, '''
            SELECT t.tablename as table_name, obj_description((t.schemaname || '.' || t.tablename)::regclass, 'pg_class') as comment
            FROM pg_catalog.pg_tables t
            WHERE t.schemaname='%s';
            ''' % database):
                tables.append({'name': r[0], 'desc': r[1], 'type': 'table'})
            return tables

    elif dbinfo['db_type'] ==engine.DB_MYSQL:
        if database is None:
            databases=[]
            for r in query(dbid, "show databases"):
                databases.append({'name': r[0], 'desc': '', 'type': 'db'})
            return databases
        else:
            tables=[]
            for r in query(dbid, '''
                SELECT table_name, table_comment FROM information_schema.tables
                WHERE table_schema = '%s'
            ''' % database):
                tables.append({'name': r[0], 'desc': r[1], 'type': 'table'})
            return tables

    else:
        if database is None:
            databases=[]
            for r in query(dbid, "show databases"):
                databases.append({'name': r[0], 'desc': '', 'type': 'db'})
            return databases
        else:
            tables=[]
            for r in query(dbid, "show tables", db=database):
                tables.append({'name': r[0], 'desc': '', 'type': 'table'})
            return tables

