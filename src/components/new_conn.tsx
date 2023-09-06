import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { dlgStyle300 } from './styles';
import { IDBConn } from '../interfaces'

export class ConnDialog extends ReactWidget {
    
    constructor(conn?:IDBConn) {
        super();
        this._conn=conn as IDBConn
    }
    
    getValue(): IDBConn {
        return this.form.getValue()
    }

    render(): JSX.Element {
        return <ConnForm dialog={this} conn={this._conn}/>
    }

    public form!: ConnForm;
    private _conn : IDBConn;
}

interface IConnFormProps {
    dialog: ConnDialog,
    conn?: IDBConn
}

class ConnForm extends React.Component<IConnFormProps, Partial<IDBConn>> {
  
    constructor(props:IConnFormProps) {
        super(props);
        this.state = {...this.props.conn}
    }

    getValue() : IDBConn {
        return this.state as IDBConn
    }

    render() {
        this.props.dialog.form=this
        let {db_id, db_type, db_name, db_host, db_port, db_user, db_pass, name}=this.state
        return (
          <div className={dlgStyle300}>
            <div className='jp-InputGroup'>
                <div>名称</div>
                <input className='bp3-input'  value={name} 
                    onChange={this._onChange('name')}/>
                <div>ID</div>
                <input className='bp3-input'  value={db_id} 
                    onChange={this._onChange('db_id')}/>
                <div>类型</div>
                <select className='bp3-input' value={db_type} onChange={this._onChange('db_type')}>
                    <option value='1'>mysql</option>
                    <option value='2'>pgsql</option>
                    <option value='3'>oracle</option>
                    <option value='4'>hive</option>
                    <option value='5'>hive-kerbert</option>
                    <option value='6'>sqlite</option>
                </select>
                { db_type!='6' && 
                    <>
                        <div>IP地址</div>
                        <input className='bp3-input'  value={db_host} 
                            onChange={this._onChange('db_host')}/>
                        <div>端口</div>
                        <input className='bp3-input'  value={db_port} 
                            onChange={this._onChange('db_port')}/>
                        <div>用户名</div>
                        <input className='bp3-input'  value={db_user} 
                            onChange={this._onChange('db_user')}/>
                        <div>密码</div>
                        <input className='bp3-input'  value={db_pass} 
                            onChange={this._onChange('db_pass')}/>
                     </>}
                <div>数据库</div>
                <input className='bp3-input'  value={db_name} 
                    onChange={this._onChange('db_name')}/>
            </div>
          </div>
        );
    }
    
    private _onChange = (key:keyof IDBConn) =>( event: React.ChangeEvent<HTMLInputElement> | 
                                                React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({[key]: event.target.value});
    };
}