import sqlparse
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

def set_limit(sql: str, def_lim: int = 200, max_lim: int = 10000) -> (bool, str):
    '''
    Append LIMIT to a select sql statment.
    If the LIMIT is not set, set the LIMIT to def_lim. If the LIMIT is set and LIMIT < max_limit, keep it unchanged. 
    Otherwise, modify the LIMIT to max_limit.
    '''
    parsed = sqlparse.parse(sql)
    if len(parsed)!=1:
        return False, 'can only process one statement'

    stmt = parsed[0]
    if not isinstance(stmt, sqlparse.sql.Statement) or stmt.get_type() != "SELECT":
        return True, sql

    out=''
    has_limit=False
    for token in stmt:
        if has_limit is False:
            if token.ttype == sqlparse.tokens.Keyword and token.value.upper() == "LIMIT":
                has_limit = True  # limit found
            else:
                out += str(token)
        else:
            if token.ttype == sqlparse.tokens.Literal.Number.Integer:
                limit_value = int(token.value)
    use_lim = def_lim
    if has_limit:
        if limit_value<=max_lim:
            use_lim = limit_value
        else:
            use_lim = max_lim
    out += f' LIMIT {use_lim}'
    return True, out

def query_exec(dbid, sql, **kwargs) ->dict:
    '''
    make a query, return with header
    '''
    rc, sql = set_limit(sql, 10000)
    if not rc:
        raise Exception(sql)

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
                SELECT column_name, data_type, description as comment, table_name
                FROM information_schema.columns
                LEFT JOIN pg_catalog.pg_description 
                    ON (pg_description.objoid = (table_schema || '.' || table_name)::regclass 
                          AND pg_description.objsubid = ordinal_position)
                WHERE table_schema = '%s' and table_name='%s'
                ORDER BY ordinal_position
            ''' %(db, tbl)):
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
        for r in query(dbid, '''
            SELECT
                name,
                CASE type
                    WHEN 'view' THEN 'V'
                    ELSE 'T'
                END
            FROM sqlite_master where type='table' or type='view'
        '''):
            tables.append({'name': r[0], 'desc': '', 'type': 'table', 'subtype': r[1]})
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
            SELECT
                t.table_name,
                CASE t.table_type
                    WHEN 'BASE TABLE' THEN 'T'
                    ELSE 'V'
                END,
                obj_description((t.table_schema || '.' || t.table_name)::regclass, 'pg_class') as comment
            FROM information_schema.tables t
            WHERE t.table_schema='%s'
            ''' % database):
                tables.append({'name': r[0], 'desc': r[2], 'type': 'table', 'subtype': r[1]})
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
                SELECT
                    table_name,
                    table_comment,
                    CASE table_type
                        WHEN 'VIEW' THEN 'V'
                        ELSE 'T'
                    END
                FROM information_schema.tables
                WHERE table_schema = '%s'
            ''' % database):
                tables.append({'name': r[0], 'desc': r[1], 'type': 'table', 'subtype': r[2]})
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

