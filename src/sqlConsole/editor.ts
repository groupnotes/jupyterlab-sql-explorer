import {
  IEditorFactoryService,
  CodeEditor,
  CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

export interface IEditor extends IDisposable {
  readonly widget: EditorWidget;

  readonly value: string;
  readonly sql: string;
  readonly appendText: (txt: string) => void;
  readonly execute: ISignal<this, string>;
  readonly valueChanged: ISignal<this, string>;
  readonly updateConn: (conn: string) => void;
}

export class Editor implements IEditor, IDisposable {
  constructor(model: CodeEditor.IModel, editorFactory: IEditorFactoryService) {
    this._model = model;
    this._widget = new EditorWidget(model, editorFactory);
    this._model.sharedModel.changed.connect(() => {
      this._valueChanged.emit(this.value);
    }, this);
    this._model.mimeType = 'text/x-sql';
    this._widget.executeCurrent.connect(() => {
      this._execute.emit(this.value);
    }, this);
  }

  get isDisposed(): boolean {
    return this._widget.isDisposed;
  }

  dispose(): void {
    Signal.clearData(this);
    this._widget.dispose();
  }

  appendText(txt: string): void {
    const editor = this.widget.editor;
    if (editor.replaceSelection) {
      editor.replaceSelection(txt);
    }
  }

  updateConn(conn: string): void {
    const newline = `-- conn: ${conn}`;
    const lines = this.value.split('\n');
    const line0 = lines[0];
    const match = line0?.match(/^--\s*conn:\s*(.*?)\s*$/);
    if (match) {
      lines[0] = newline;
    } else {
      lines.unshift(newline + '\n');
    }
    this.widget.model.sharedModel.setSource(lines.join('\n'));
  }

  get value(): string {
    return this._model.sharedModel.getSource();
  }

  get sql(): string {
    // Get the current SQL statement separated by semicolons
    // or the selected text as sql
    const editor = this.widget.editor;
    const selection = editor.getSelection();
    const start: number = editor.getOffsetAt(selection.start);
    const end: number = editor.getOffsetAt(selection.end);
    let text = this._model.sharedModel.getSource();
    if (start !== end) {
      if (start > end) {
        text = text.slice(end, start);
      } else {
        text = text.slice(start, end);
      }
    }
    return this.findSegment(text, start);
  }

  private findSegment(text: string, pos: number): string {
    // segment by ;, and return whitch around pos
    const segments = text.split(';');
    let segmentIndex = -1;

    // if pos is at  ';\n' backword one
    if (pos > 1 && text[pos] === '\n' && text[pos - 1] === ';') {
      pos = pos - 1;
    }

    for (let i = 0; i < segments.length; i++) {
      if (pos <= segments[i].length) {
        segmentIndex = i;
        break;
      }

      pos -= segments[i].length + 1;
    }

    if (segmentIndex === -1) {
      segmentIndex = segments.length - 1;
    }

    if (
      segments[segmentIndex].trim() === '' &&
      segmentIndex === segments.length - 1 &&
      segmentIndex > 0
    ) {
      segmentIndex--;
    }
    return segments[segmentIndex];
  }

  get widget(): EditorWidget {
    return this._widget;
  }

  get execute(): ISignal<this, string> {
    return this._execute;
  }

  get valueChanged(): ISignal<this, string> {
    return this._valueChanged;
  }

  private _execute = new Signal<this, string>(this);
  private _valueChanged = new Signal<this, string>(this);
  private _widget: EditorWidget;
  private _model: CodeEditor.IModel;
}

export class EditorWidget extends CodeEditorWrapper {
  constructor(model: CodeEditor.IModel, editorFactory: IEditorFactoryService) {
    super({
      model,
      factory: editorFactory.newInlineEditor
    });
    //this.editor.addKeydownHandler(this._onKeydown);
    this.addClass('jp-sql-explorer-ed');
  }

  dispose = (): void => {
    //this.editor.addKeydownHandler(this._onKeydown);
    //this.editor.removeKeydownHandler(this._onKeydown)
    super.dispose();
  };

  get executeCurrent(): ISignal<this, void> {
    return this._executeCurrent;
  }

  _onKeydown = (_: CodeEditor.IEditor, event: KeyboardEvent): boolean => {
    if ((event.shiftKey || event.ctrlKey) && event.key === 'Enter') {
      this.run();
      return true;
    }
    return false;
  };

  run(): void {
    this._executeCurrent.emit(void 0);
  }

  private _executeCurrent = new Signal<this, void>(this);
}
