import * as React from 'react';
import { showDialog, Dialog, ReactWidget } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';
import { IDBConn } from '../interfaces'

export function newConnDialog(trans:TranslationBundle) {
  const body = new ConnDialog();

  const buttons = [
    Dialog.cancelButton(),
    Dialog.okButton({ label: trans.__('Submit') })
  ];

  showDialog({
    title: trans.__('Create New DB connection'),
    body: body,
    buttons
  }).then(result => {
    if (result.button.label === 'Submit') {
      const value = result.value
      console.log('Submitted:', value);
    } else {
      console.log('Canceled');
    }
  });
}

class ConnDialog extends ReactWidget {

    getValue(): IDBConn {
        return this.form.getValue()
    }

    render(): JSX.Element {
        return <ConnForm dialog={this}/>
    }

    public form!: ConnForm;
}

export interface IForm extends React.Component {
    getValue : ()=>any
}

export class ConnForm extends React.Component<{dialog:ConnDialog}, Partial<IDBConn>> implements IForm {
  
    state : IDBConn = { db_id:'', db_type: '6', db_name:'' };
    
    getValue() : IDBConn {
        return this.state
    }

    render() {
        this.props.dialog.form=this
        let {db_id, db_type, db_name, db_host, db_port, db_user, db_pass, name}=this.state
        return (
          <div style={{width:300}}>
            <div className='jp-InputGroup bp3-input-group'>
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
    
    private _onChange = (key:keyof IDBConn) =>(event: React.ChangeEvent<HTMLInputElement>| React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({[key]: event.target.value});
    };
    
}