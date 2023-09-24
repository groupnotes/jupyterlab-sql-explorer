import os
import re
import json
import base64
import sqlalchemy
import gettext
from urllib.parse import quote_plus
_ = gettext.gettext

DB_ROOT='~/work/.database/'
DB_CFG=DB_ROOT+'db_conf.json'

DB_MYSQL = '1'
DB_PGSQL = '2'
DB_ORACLE = '3'
DB_HIVE_LDAP = '4'
DB_HIVE_KERBEROS = '5'
DB_SQLITE = '6'

_temp_pass_store = dict()

def open_dbfile(dbfile):
    expanded_file_path = os.path.expanduser(dbfile)
    dir_name = os.path.dirname(expanded_file_path)
    os.makedirs(dir_name, exist_ok=True)
    return open(expanded_file_path, 'wt')

def _getDBlist()->list:
    dbs=[]
    for e in os.environ:
        if e[0:3]=='DB_':
            dbs.append(e[3:])
    return dbs

def getDBlist()->list:
    dbs = _getDBlist()
    lst=[]

    for dbid in dbs:
        info = _getDbInfo(dbid)
        subtype = int(info['db_type'])
        lst.append({'name': dbid, 'desc': '', 'type': 'conn', 'subtype': subtype, 'fix': 1})

    for dbid, e in _getCfgEntryList().items():
        lst.append({'name': dbid, 'desc': e['name'], 'type': 'conn', 'subtype': int(e['db_type'])})

    return lst

def _getCfgEntryList(passfile=DB_CFG)->list:
    passfile= os.path.expanduser(passfile)
    if os.path.exists(passfile):
        with open(passfile, mode='rt') as f:
            try:
                dblst = json.load(f)
            except:
                dblist={}
    else:
        dblst={}
    return dblst

def _getCfgEntry(name, passfile=DB_CFG):
    dblst = _getCfgEntryList(passfile)
    if name in dblst:
        return dblst[name]
    return None

def _getDbInfo(name: str)-> 'dict | None':
    var_name='DB_' + name
    db_str=os.getenv(var_name)

    if db_str is not None:
        return json.loads(base64.b64decode(db_str.encode()))

    return _getCfgEntry(name)

def getDbInfo(name: str)-> 'dict | None':
    i = _getDbInfo(name)
    if i is None:
        return None
    if 'db_pass' in i:
        del i['db_pass']
    return i

def _getSQL_engine(dbid, db, usedb=None):

    db_host = db['db_host'] if 'db_host' in db else ''
    db_name = db['db_name'] if 'db_name' in db else ''

    if usedb is not None and db['db_type'] in [DB_MYSQL, DB_HIVE_LDAP, DB_HIVE_KERBEROS]:
        # 对于 myql, hive database / schema 等价
        db_name=usedb

    if db['db_type'] == DB_HIVE_KERBEROS:  # Hive-kerberos
        db_port = db['db_port'] if 'db_port' in db else 10000
        principal = db['principal']
        os.system(f"kinit -kt /opt/conda/etc/keytab_{dbid} {principal}")
        # from pyhive import hive
        # return hive.connect(host=db_host, port=int(db_port), auth='KERBEROS', kerberos_service_name='hive')
        sqlstr = f"hive://{db_host}:{db_port}/{db_name}"
        return sqlalchemy.create_engine(sqlstr, connect_args={'auth': 'KERBEROS', 'kerberos_service_name': 'hive'})

    #
    # set user/pass for db exclude DB_SQLITE
    #
    if db['db_type']!=DB_SQLITE:
        if 'db_user' not in db or 'db_pass' not in db:
            if dbid not in _temp_pass_store:
                db_user = db['db_user'] if 'db_user' in db else None
                input_passwd(dbid, db_user)
                return
            else:
                db_user = _temp_pass_store[dbid]['user']
                db_pass = _temp_pass_store[dbid]['pwd']
        else:
            db_user = db['db_user']
            db_pass = db['db_pass']
        db_pass = quote_plus(db_pass)

    if db['db_type'] == DB_MYSQL:   # MYSQL
        db_port = db['db_port'] if 'db_port' in db else 3306
        sqlstr= f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    elif db['db_type'] == DB_PGSQL:  # PGSQL
        db_port = db['db_port'] if 'db_port' in db else 5432
        sqlstr = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    elif db['db_type'] == DB_ORACLE:  # ORACLE
        db_port = db['db_port'] if 'db_port' in db else 1521
        sqlstr = f"oracle+cx_Oracle://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    elif db['db_type'] == DB_HIVE_LDAP:  # Hive-LDAP
        db_port = db['db_port'] if 'db_port' in db else 10000
        # return hive.connect(db_host, port=int(db_port), auth='LDAP', username=db_user, password=db_pass)
        sqlstr = f"hive://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
        return sqlalchemy.create_engine(sqlstr, connect_args={'auth': 'LDAP'})
    elif db['db_type'] == DB_SQLITE:  # SQLITE
        if db_name[0]!='/' and db_name!=':memory:':
            db_name=os.path.expanduser(DB_ROOT+db_name)

        # make sure parent dir exists
        dir_name = os.path.dirname(db_name)
        if not os.path.isdir(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        sqlstr = f"sqlite+pysqlite:///{db_name}"
        return sqlalchemy.create_engine(sqlstr)
    else:
        raise ValueError(("unsupport database type"))

    return sqlalchemy.create_engine(sqlstr, pool_size=20, max_overflow=20, pool_timeout=30000, echo=False)

def __gen_krb5_conf(db):

    if db['db_type'] != DB_HIVE_KERBEROS:
        return

    default_realm = db['def_realm']
    with open('/opt/conda/etc/krb5.conf', 'a') as f:
        f.write(f"[libdefaults]\ndefault_realm = {default_realm}\ndns_lookup_realm = false\ndns_lookup_kdc = false\n\n[realms]\n")
        for realm, cfg in db['krb5conf'].items():
            f.write("  %s = {\n" % realm)
            for k, v in cfg.items():
                f.write(f"    {k} = {v}\n")
            f.write("  }\n")
    # os.system('cat /opt/conda/etc/krb5.conf')

def getEngine(dbid, usedb=None):

    dbinfo = _getDbInfo(dbid)

    if dbinfo is None:
        if os.environ.get('BATCH'):
            print("Can't Access DB: %s" % dbid)
            return False
        newinfo = addEntry(name=dbid)
        return
        __gen_krb5_conf(newinfo)
        return _getSQL_engine(dbid, newinfo, usedb)
    else:
        __gen_krb5_conf(dbinfo)
        return _getSQL_engine(dbid, dbinfo, usedb)

def addEntry(dbinfo, dbfile=DB_CFG):
    dbid = dbinfo['db_id']
    err=''

    if 'db_type' not in dbinfo:
        raise Exception('must set db type.')

    if dbinfo['db_type'] != DB_SQLITE:
        if 'db_host' not in dbinfo:
            err='must set ip addr.'

    if dbinfo['db_type'] == DB_PGSQL:
        if 'db_name' not in dbinfo:
            err='postgres must set database name to connect'

    # check dataname format
    if dbinfo['db_type'] == DB_SQLITE:
        if 'db_name' not in dbinfo:
            err="sqlite must set db name ( it's a database file )"
    elif 'db_name' in dbinfo:
        if not re.match(r'^[a-zA-Z0-9_]+$', dbinfo['db_name']):
            err='db name can only contain letters, numbers, and underscores.'

    fix_dbs =_getDBlist()
    dbcfg=_getCfgEntryList(dbfile)
    if dbid in fix_dbs or dbid in dbcfg:
        err=f'db_id {dbid} already exists.'

    if 'name' not in dbinfo:
        dbinfo['name']=''

    if err!='':
        raise Exception(err)

    dbcfg[dbid]=dbinfo
    cfg=json.dumps(dbcfg, indent=4)
    with open_dbfile(dbfile) as f:
        f.write(cfg)
    return dbinfo

def delEntry(dbid, dbfile=DB_CFG):
    dbcfg=_getCfgEntryList(dbfile)
    if dbid in dbcfg:
        del dbcfg[dbid]
        cfg=json.dumps(dbcfg, indent=4)
        with open_dbfile(dbfile) as f:
            f.write(cfg)

def check_pass(dbid: str)->(bool, str):
    '''
    check passwd is set for dbid
    '''
    dbinfo = _getDbInfo(dbid)
    if dbinfo is None or 'db_type' not in dbinfo:
        raise Exception('conn not exists or error')

    if dbinfo['db_type']==DB_HIVE_KERBEROS or dbinfo['db_type']==DB_SQLITE:
        return (True, None)

    if 'db_user' in dbinfo and 'db_pass' in dbinfo:
        return (True, None)

    if dbid in _temp_pass_store:
        return (True, None)

    db_user = dbinfo['db_user'] if 'db_user' in dbinfo else ''
    return (False, db_user)

def set_pass(dbid: str, user: str, pwd: str)->(bool, str):
    _temp_pass_store[dbid]={'user': user, 'pwd': pwd}

    eng = getEngine(dbid)
    if eng:
        try:
            conn = eng.connect()
            conn.close()
            return True, None
        except:
            del _temp_pass_store[dbid]
            return False, "user or passwd error"
    else:
        del _temp_pass_store[dbid]
        return False, "user or passwd error"

def clear_pass(dbid: str)->None:
    global _temp_pass_store
    if dbid is None or dbid=='':
        _temp_pass_store=dict()
    elif dbid in _temp_pass_store:
        del _temp_pass_store[dbid]
