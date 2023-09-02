from . import engine

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
    usedb=None
    if 'db' in kwargs:
        usedb=kwargs['db']
    eng = engine.getEngine(dbid, usedb)
    if eng:
        conn = eng.connect()
        result = conn.execute(sql)
        data = result.fetchall()
        columns = list(result.keys())
        conn.close()
        return {'columns': columns, 'data': data}

    return []



def get_column_info(dbid, db, tbl):
    '''
    '''
    dbinfo = engine.getDbInfo(dbid)
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
                SELECT column_name, column_comment
                FROM pg_catalog.pg_description
                JOIN information_schema.columns ON (pg_description.objoid = (table_schema || '.' || table_name)::regclass AND pg_description.objsubid = ordinal_position)
                WHERE table_name = '%s' AND table_schema = '%s'
            ''' %(tbl, db)):
                print(r)
                columns.append({'name': r[0], 'desc': '', 'type': 'col'})
        elif dbinfo['db_type'] ==engine.DB_ORACLE:
            for r in query(dbid, f"SELECT column_name, comments FROM all_col_comments WHERE table_name = '${tbl}'"):
                print(r)
                columns.append({'name': r[0], 'desc': '', 'type': 'col'})
        elif dbinfo['db_type'] ==engine.DB_HIVE_LDAP or dbinfo['db_type'] ==engine.DB_HIVE_KERVERS:
            for r in query(dbid, f"DESCRIBE {tbl}", db=db):
                print(r)
                columns.append({'name': r[0], 'desc': '', 'type': 'col'})
    return columns

def get_db_or_table(dbid, database):
    '''
    Obtain the database or table (if there is no database layer) of a specified database 
    connection
    '''
    dbinfo = engine.getDbInfo(dbid)
    if dbinfo is None:
        return None

    if dbinfo['db_type'] ==engine.DB_SQLITE:
        tables=[]
        for r in query(dbid, "SELECT name FROM sqlite_master WHERE type='table'"):
            tables.append({'name': r[0], 'desc': '', 'type': 'table'})
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

