import { fromObject } from "data/observable";
import stackLayout = require("ui/layouts/stack-layout");
import { BindingOptions } from "ui/core/bindable";
import { View } from "ui/page";
import { TextField } from "ui/text-field";
import { handleClearFocus } from "../utilsAndroid";
import { Color } from "color";
import { TextInputLayout } from "nativescript-textinputlayout";
import { AndroidApplication, AndroidActivityBackPressedEventData } from "application";
import * as app from "application";

import { Property } from "tns-core-modules/ui/core/properties";
import * as utils from "utils/utils";

const textProperty = new Property({
    name: "text",
    defaultValue: "",
    affectsLayout:false,
    // valueChanged: (target, old, newValue) => {
    //     console.log("valueChanged", target, old, newValue);
    //     if (target instanceof CTextField && old !== newValue && target.textField.text !== newValue) {
    //         console.log("valueChanged prop", target.textField.text, target, old, newValue);
    //         // target.textField.text = newValue;
    //     }
    // }
});
const hintProperty = new Property({
    name: "hint",
    defaultValue: ""
});
let dismissKeyboardTimeoutId: any;

interface EditTextListeners extends android.text.TextWatcher, android.view.View.OnFocusChangeListener, android.widget.TextView.OnEditorActionListener {}

interface EditTextListenersClass {
    prototype: EditTextListeners;
    new (owner: TextField): EditTextListeners;
}

let EditTextListeners: EditTextListenersClass;

function initializeEditTextListeners(): void {
    if (EditTextListeners) {
        return;
    }

    @Interfaces([android.text.TextWatcher, android.view.View.OnFocusChangeListener, android.widget.TextView.OnEditorActionListener])
    class EditTextListenersImpl extends java.lang.Object implements android.text.TextWatcher, android.view.View.OnFocusChangeListener, android.widget.TextView.OnEditorActionListener {
        constructor(private owner: TextField) {
            super();
            return global.__native(this);
        }

        public beforeTextChanged(text: string, start: number, count: number, after: number) {
            //
        }

        public onTextChanged(text: string, start: number, before: number, count: number) {
            // const owner = this.owner;
            // let selectionStart = owner.android.getSelectionStart();
            // owner.android.removeTextChangedListener(owner._editTextListeners);
            // owner.android.addTextChangedListener(owner._editTextListeners);
            // owner.android.setSelection(selectionStart);
        }

        public afterTextChanged(editable: android.text.IEditable) {
            const owner: any = this.owner;
            if (!owner || owner._changeFromCode) {
                return;
            }

            switch (owner.updateTextTrigger) {
                case "focusLost":
                    owner._dirtyTextAccumulator = editable.toString();
                    break;
                case "textChanged":
                    textProperty.nativeValueChange(owner, editable.toString());
                    break;
                default:
                    throw new Error("Invalid updateTextTrigger: " + owner.updateTextTrigger);
            }
        }

        public onFocusChange(view: android.view.View, hasFocus: boolean) {
            console.log("onFocusChange", hasFocus);
            const owner: any = this.owner;
            if (!owner) {
                return;
            }

            if (hasFocus) {
                if (dismissKeyboardTimeoutId) {
                    // https://github.com/NativeScript/NativeScript/issues/2942
                    // Don't hide the keyboard since another (or the same) EditText has gained focus.
                    clearTimeout(dismissKeyboardTimeoutId);
                    dismissKeyboardTimeoutId = undefined;
                }
                owner.notify({ eventName: TextField.focusEvent, object: owner });
            } else {
                if (owner._dirtyTextAccumulator || owner._dirtyTextAccumulator === "") {
                    textProperty.nativeValueChange(owner, owner._dirtyTextAccumulator);
                    owner._dirtyTextAccumulator = undefined;
                }

                dismissKeyboardTimeoutId = setTimeout(() => {
                    // https://github.com/NativeScript/NativeScript/issues/2942
                    // Dismiss the keyboard if focus goes to something different from EditText.
                    owner.dismissSoftInput();
                    dismissKeyboardTimeoutId = null;
                }, 1);

                owner.notify({ eventName: TextField.blurEvent, object: owner });
            }
        }

        public onEditorAction(textView: android.widget.TextView, actionId: number, event: android.view.KeyEvent): boolean {
            const owner: any = this.owner;
            if (!owner) {
                return;
            }

            if (
                actionId === android.view.inputmethod.EditorInfo.IME_ACTION_DONE ||
                actionId === android.view.inputmethod.EditorInfo.IME_ACTION_GO ||
                actionId === android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH ||
                actionId === android.view.inputmethod.EditorInfo.IME_ACTION_SEND ||
                (event && event.getKeyCode() === android.view.KeyEvent.KEYCODE_ENTER)
            ) {
                // If it is TextField, close the keyboard. If it is TextView, do not close it since the TextView is multiline
                // https://github.com/NativeScript/NativeScript/issues/3111
                if (textView.getMaxLines() === 1) {
                    owner.dismissSoftInput();
                }
                owner._onReturnPress();
                return true;
            }

            // If action is ACTION_NEXT then do not close keyboard
            if (actionId === android.view.inputmethod.EditorInfo.IME_ACTION_NEXT) {
                owner._onReturnPress();
                return false;
            }

            return false;
        }
    }

    EditTextListeners = EditTextListenersImpl;
}

class MyEditText extends android.widget.EditText {
    static constructorCalled: boolean = false;
    // constructor
    constructor(context) {
        super(context);
        MyEditText.constructorCalled = true;
        // necessary when extending TypeScript constructors
        return global.__native(this);
    }

    dispatchKeyEventPreIme(event: android.view.KeyEvent) {
        if (event.getKeyCode() == android.view.KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == android.view.KeyEvent.ACTION_UP) {
                if (this.isFocused()) {
                    handleClearFocus(this);
                }
            }
        }
        return super.dispatchKeyEventPreIme(event);
    }
}

class MyStackLayout extends org.nativescript.widgets.StackLayout {
    static constructorCalled: boolean = false;
    // constructor
    constructor(context) {
        super(context);
        MyStackLayout.constructorCalled = true;
        // necessary when extending TypeScript constructors
        return global.__native(this);
    }

    // const listeners = new EditTextListeners(this);
    //     editText.addTextChangedListener(listeners);
    //     editText.setOnFocusChangeListener(listeners);

    // onFocusChange(v:android.view.View, hasFocus:boolean )
    // {

    // 	if (v == realtv)
    // 		console.log("onFocusChange "  + hasFocus + "  for FocusFixedEditText with text " + realtv.getText(), Log.DEBUG_MODE);
    // 	else
    //         console.log("onFocusChange "  + hasFocus + "  for FocusFixedEditText  layout with text " + realtv.getText(), Log.DEBUG_MODE);
    // 	if (!realtv.isFocusable()) return;
    // 	if (hasFocus) {
    // 		Boolean clearOnEdit = (Boolean) proxy.getProperty(TiC.PROPERTY_CLEAR_ON_EDIT);
    // 		if (clearOnEdit != null && clearOnEdit) {
    // 			realtv.setText("");
    // 		}
    // 		Rect r = new Rect();
    // 		nativeView.getFocusedRect(r);
    // 		nativeView.requestRectangleOnScreen(r);

    // 	}
    // 	super.onFocusChange(v, hasFocus);
    // }
}

class MyTextField extends TextField {
    public createNativeView() {
        initializeEditTextListeners();
        const editText = new MyEditText(this._context);
        this["_configureEditText"](editText);

        const listeners = new EditTextListeners(this);
        editText.addTextChangedListener(listeners);
        editText.setOnFocusChangeListener(listeners);
        editText.setOnEditorActionListener(listeners);
        (<any>editText).listener = listeners;
        return editText;
    }

    // public _onReturnPress() {
    //     console.log('_onReturnPress');
    //     super['_onReturnPress']();
    // }
}

export class CTextField extends stackLayout.StackLayout {
    public textField: MyTextField;
    public textinputlayout: TextInputLayout;
    text: string;

    createNativeView() {
        return new MyStackLayout(this._context);
    }

    constructor() {
        super();
        this.textField = new MyTextField();
        this.textField.bind(
            {
                sourceProperty: "text",
                targetProperty: "text",
                twoWay: true
            },
            this
        );
        this.textField.bind(
            {
                sourceProperty: "hint",
                targetProperty: "hint",
                twoWay: true
            },
            this
        );
        this.textField.bind(
            {
                sourceProperty: "color",
                targetProperty: "color",
                twoWay: true
            },
            this
        );
        this.textinputlayout = new TextInputLayout();
        this.textinputlayout["textField"] = this.textField;
        this.addChild(this.textinputlayout);
    }

    // get text() {
    //     console.log('get', 'text', this._getValue(textProperty));
    //     return this._getValue(textProperty);
    // }

    // set text(value: string) {
    //     console.log('set', 'text', value);
    //     this._setValue(textProperty, value);
    //     this.textField.text = value;
    // }

    public onLoaded(): void {
        super.onLoaded();
        (this.textinputlayout.android as android.view.View).setFocusable(false);
        (this.textinputlayout.android as android.view.View).setFocusableInTouchMode(false);
        (this.textinputlayout.android as android.view.ViewGroup).setDescendantFocusability(android.view.ViewGroup.FOCUS_AFTER_DESCENDANTS);

        (this.android as android.view.View).setFocusable(false);
        (this.android as android.view.View).setFocusableInTouchMode(false);
        (this.android as android.view.ViewGroup).setDescendantFocusability(android.view.ViewGroup.FOCUS_AFTER_DESCENDANTS);
    }
    focus() {
        const result = this.textField.focus();
        if (result) {
            utils.ad.showSoftInput(this.textField);
        }
        return result;
    }
    blur() {
        handleClearFocus(this.textField.android as android.view.View);
        // (this.textField.android as android.view.View).clearFocus();
    }
    // focusNext() {
    //     // handleClearFocus(this.textField.android as android.view.View);
    //     (this.android as android.view.View).clearFocus();
    // }
    hasFocus() {
        return (this.textField.android as android.view.View).isFocused();
    }
}
textProperty.register(CTextField);
hintProperty.register(CTextField);
