/// <reference path="../../node_modules/tns-platform-declarations/android.d.ts" />
import * as moment from "moment";
import { Observable, EventData } from "data/observable";
import { ObservableArray } from "data/observable-array";
import { BarcodeScanner } from "nativescript-barcodescanner";
import { alert } from "ui/dialogs";
import { Page } from "ui/page";
import { Label } from "ui/label";
import * as appSettings from "application-settings";
import { Popup } from "nativescript-popup";
import { ItemEventData } from "ui/list-view/list-view";
import { TextField } from "ui/text-field";
import { CTextField } from "../shared/ctextfield";
import * as fs from "file-system";
import * as builder from "ui/builder";
import { Image } from "ui/Image";
import * as imageSource from "image-source";
import { localize } from "nativescript-localize";
import { ShareFile } from "nativescript-share-file";

import { device, platformNames } from "platform";

import { Vibrate } from "nativescript-vibrate";
const vibrator = new Vibrate();

function ObservableArrayToString(array: ObservableArray<any>) {
    let res = [];
    array.forEach(s => res.push(s));
    return JSON.stringify(res);
}

function clearObservableArray(array: ObservableArray<any>) {
    while (array.length) {
        array.pop();
    }
}

class FilteredList extends Observable {
    _value: string;
    savekey: string;
    _textField: CTextField;
    constructor(private key: string, private parent: Model) {
        super();
        this.savekey = "saved" + key;
        this.items = new ObservableArray<string>();
        let saved: string[] = JSON.parse(appSettings.getString(this.savekey) || '[ ]');
        console.log("saved", this.savekey, JSON.stringify(saved));
        saved.forEach(s => this.items.push(s));
        this.createFiltered(this.items as any);
    }
    get items(): ObservableArray<string> {
        return this.get("_items");
    }
    set items(value: ObservableArray<string>) {
        this.set("_items", value);
    }

    get filteredItems(): ObservableArray<any> {
        return this.get("_filteredItems");
    }
    set filteredItems(value: ObservableArray<any>) {
        this.set("_filteredItems", value);
    }
    has(value: string) {
        return this.items.indexOf(value) !== -1;
    }
    add(value: string) {
        console.log("add", this.key, value);
        this.items.push(value);
    }
    save() {
        appSettings.setString(this.savekey, this.toString());
    }
    toString() {
        return ObservableArrayToString(this.items);
    }

    saveCurrentValue = () => {
        const value = this._value.trim();
        console.log("saveCurrentValue", this.key, value);
        if (value.length > 3 && !this.has(value)) {
            this.add(value);
            this.save();
            console.log("added", this.key, value, this.toString());
        }
    };

    createFiltered(items: string[] | ObservableArray<string>) {
        this.filteredItems = new ObservableArray(
            items.map(s => {
                return { name: s };
            })
        );
    }
    onTextFieldFocus = () => {
        console.log("onTextFieldFocus", this.key, this.parent);
        // const value = this._textField.text.trim();
        if (this.filteredItems.length > 0) {
            this.parent.showPopup(this.textfield, this.key + "list");
        }
    };
    onTextFieldBlur = () => {
        console.log("onTextFieldBlur", this.key, this.parent);
        this.parent.hidePopup();
    };
    set textfield(value: CTextField) {
        console.log("set textfield", this.key, this.parent);
        if (value) {
            this._textField = value;
            this._textField.textField.on(TextField.focusEvent, this.onTextFieldFocus);
            this._textField.textField.on(TextField.blurEvent, this.onTextFieldBlur);
        }
    }
    get textfield() {
        return this._textField;
    }

    set value(value: string) {
        const newValue = !!value ? value.trim() : value;
        if (this._value !== newValue) {
            console.log('set value', this.key, newValue);
            this._value = this._textField.text = newValue;
            if (!newValue) {
                this._textField.clearText();
            }
            this.updateFilteredTerm(this._value);
        }
    }
    get value() {
        return this._value;
    }

    updateFilteredTerm(term: string) {
        console.log("updateFilteredTerm", this.key, term);
        if (this.items.length === 0) {
            return;
        }

        const result =
            !term || term.length === 0
                ? (this.items as any)
                : this.items.filter(function(item) {
                      return item && item.toLowerCase() !== term.toLowerCase() && item.toLowerCase().indexOf(term.toLowerCase()) > -1;
                  });
        this.createFiltered(result);
        if (!this.textfield.hasFocus()) {
            return;
        }
        if (this.filteredItems.length > 0) {
            this.parent.showPopup(this.textfield, this.key + "list");
        } else {
            this.parent.hidePopup();
        }
    }
}

export class Model extends Observable {
    private barcodeScanner: BarcodeScanner;
    private popup: Popup;
    // _recipient: string
    // _deliverer: string
    clerkTextField: CTextField;
    _receiving_clerk: string;
    recipientList: FilteredList;
    delivererList: FilteredList;
    scans = new ObservableArray<any>();
    pendingScans = new ObservableArray<any>();
    signatureImage: Image;
    constructor() {
        super();
        this.recipientList = new FilteredList("recipient", this);
        this.delivererList = new FilteredList("deliverer", this);
        let scans: string[] = JSON.parse(appSettings.getString("scans") || "[]");
        scans.forEach(s => this.scans.push(s));
        this.barcodeScanner = new BarcodeScanner();
    }

    get recipientItems() {
        return this.recipientList.items;
    }

    get filteredRecipientItems() {
        return this.recipientList.filteredItems;
    }

    get receiving_clerk() {
        return this._receiving_clerk;
    }

    set receiving_clerk(value: string) {
        const newValue = !!value ? value.trim() : value;
        if (this._receiving_clerk !== newValue) {
            this._receiving_clerk = this.clerkTextField.text = newValue;
            if (!newValue) {
                this.clerkTextField.clearText();
            }
        }
    }

    get deliverer() {
        return this.delivererList.value;
    }

    set deliverer(value: string) {
        this.delivererList.value = value;
    }

    set delivererTextField(value: CTextField) {
        this.delivererList.textfield = value;
    }
    get delivererTextField() {
        return this.delivererList.textfield;
    }

    get delivererItems() {
        return this.delivererList.items;
    }

    get filteredDelivererItems() {
        return this.delivererList.filteredItems;
    }

    get recipient() {
        return this.recipientList.value;
    }

    set recipient(value: string) {
        this.recipientList.value = value;
    }

    set recipientTextField(value: CTextField) {
        this.recipientList.textfield = value;
    }
    get recipientTextField() {
        return this.recipientList.textfield;
    }

    doContinuousScan = () => {
        if (!this.recipient || this.recipient.length === 0) {
            return alert(localize("please_enter_recipient"));
        }
        if (!this.deliverer || this.deliverer.length === 0) {
            return alert(localize("please_enter_deliverer"));
        }
        this.barcodeScanner.scan({
            reportDuplicates: false,
            continuousScanCallback: result => {
                console.log(`${result.format}: ${result.text} @ ${new Date().getTime()}`);
                this.pendingScans.push({
                    text: result.text,
                    timestamp: Date.now()
                });
                vibrator.vibrate(500);
            },
            closeCallback: () => {
                setTimeout(() => {
                    this.clerkTextField.focus();
                }, 500);
            }
        });
    };

    // private scan(front: boolean, flip: boolean, torch?: boolean, orientation?: string) {
    //     this.barcodeScanner
    //         .scan({
    //             formats: "QR_CODE, EAN_13, CODE_128",
    //             cancelLabel: "EXIT. Also, try the volume buttons!", // iOS only, default 'Close'
    //             cancelLabelBackgroundColor: "#333333", // iOS only, default '#000000' (black)
    //             message: "Use the volume buttons for extra light", // Android only, default is 'Place a barcode inside the viewfinder rectangle to scan it.'
    //             preferFrontCamera: front, // Android only, default false
    //             showFlipCameraButton: flip, // default false
    //             showTorchButton: torch, // iOS only, default false
    //             torchOn: false, // launch with the flashlight on (default false)
    //             resultDisplayDuration: 500, // Android only, default 1500 (ms), set to 0 to disable echoing the scanned text
    //             orientation: orientation, // Android only, default undefined (sensor-driven orientation), other options: portrait|landscape
    //             beepOnScan: true, // Play or Suppress beep on scan (default true)
    //             openSettingsIfPermissionWasPreviouslyDenied: true, // On iOS you can send the user to the settings app if access was previously denied
    //             closeCallback: () => {
    //                 console.log("Scanner closed @ " + new Date().getTime());
    //             }
    //         })
    //         .then(
    //             function(result) {
    //                 console.log("--- scanned: " + result.text);
    //                 // Note that this Promise is never invoked when a 'continuousScanCallback' function is provided
    //                 setTimeout(function() {
    //                     // if this alert doesn't show up please upgrade to {N} 2.4.0+
    //                     alert({
    //                         title: "Scan result",
    //                         message: "Format: " + result.format + ",\nValue: " + result.text,
    //                         okButtonText: "OK"
    //                     });
    //                 }, 500);
    //             },
    //             function(errorMessage) {
    //                 console.log("No scan. " + errorMessage);
    //             }
    //         );
    // }

    public doSign(args) {
        // this.recipient = null;
        // this.receiving_clerk = null;
        if (this.pendingScans.length === 0) {
            return alert(localize("no_scans"));
        }
        if (!this.receiving_clerk || this.receiving_clerk.length === 0) {
            return alert(localize("please_enter_receiving_clerk"));
        }
        const page = <Page>args.object.page;
        // const label = page.getViewById<Label>("label");
        // var fullscreen = (<any>args.object).text.indexOf("(full-screen)") !== -1;
        page.showModal(
            "signature/page",
            "context",
            (err, image) => {
                if (image) {
                    const img = imageSource.fromNativeSource(image);
                    // this.signatureImage.imageSource = img;
                    const folder = fs.knownFolders.documents();
                    const path = fs.path.join(folder.path, "signature_" + Date.now() + ".png");
                    const saved = img.saveToFile(path, "png");
                    if (this.pendingScans.length > 0) {
                        const recipient = this.recipient;
                        const deliverer = this.deliverer;
                        const receiving_clerk = this.receiving_clerk;
                        this.pendingScans.forEach((s, index) => {
                            s.signature = path;
                            s.recipient = recipient;
                            s.deliverer = deliverer;
                            s.receiving_clerk = receiving_clerk;
                            this.scans.push(s);
                        });
                        appSettings.setString("scans", ObservableArrayToString(this.scans));
                        clearObservableArray(this.pendingScans);
                        vibrator.vibrate(1000);
                    }
                    //save the current entries to present them in a popup on next try
                    this.delivererList.saveCurrentValue();
                    this.recipientList.saveCurrentValue();

                    // clean up fields
                    this.recipient = null;
                    this.clerkTextField.blur();
                    this.receiving_clerk = null;
                }
                // this.signatureImage.imageSource = null;
                page.closeModal();
                // label.text = username + "/" + password;
            },
            false
        );
    }

    recipientItemTap(args: ItemEventData) {
        const index = args.index;
        const item = this.filteredRecipientItems.getItem(args.index);
        if (item) {
            this.recipient = item.name;
            this.delivererTextField.focus();
        }
    }
    delivererItemTap(args: ItemEventData) {
        const index = args.index;
        const item = this.filteredDelivererItems.getItem(args.index);
        if (item) {
            this.deliverer = item.name;
            this.delivererTextField.blur();
        }
    }

    popupVisible = false;
    showPopup(source, view) {
        if (this.popupVisible) {
            return;
        }
        this.popupVisible = true;
        if (!this.popup) {
            this.popup = new Popup({
                height: 20,
                width: 80,
                unit: "%",
                elevation: 10,
                borderRadius: 2
            });
            // ((this.popup as any)._popup as android.widget.PopupWindow).setHeight(android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        const listPath = fs.path.join(fs.knownFolders.currentApp().path, "/template/" + view + ".xml");
        const component = builder.load(listPath);
        component.bindingContext = this;
        console.log("showPopup", this.popupVisible);
        this.popup.showPopup(source, component).then(data => {
            this.popupVisible = false;
            console.log("popup done", this.popupVisible);
        });
    }
    hidePopup(index?) {
        console.log("hidePopup", this.popupVisible);
        // if (!this.popupVisible) {
        //     return;
        // }
        this.popupVisible = false;
        if (this.popup) {
            this.popup.hidePopup(index);
        }
    }

    exportScans() {
        if (this.scans.length === 0) {
            return;
        }
        const now = moment();
        let fileName = `export_${this.deliverer}_${now.valueOf()}_${now.format("ll")}.csv`;
        let documents = fs.knownFolders.documents();
        let thePath = fs.path.join(documents.path, fileName);

        let testString = "date;destinataire;scan;livreur;receptionnaire;signature;";
        this.scans.forEach(scan => {
            testString += `\n${moment(scan.timestamp).format("LLL")};${scan.recipient};${scan.text};${scan.deliverer};${scan.receiving_clerk};${imageSource
                .fromFile(scan.signature)
                .toBase64String("png")};`;
        });
        let file = fs.File.fromPath(thePath);
        file.writeTextSync(testString);
        let shareFile = new ShareFile();
        shareFile.open({
            path: thePath,
            intentTitle: "Share csv file with:", // optional Android
            rect: {
                // optional iPad
                x: 110,
                y: 110,
                width: 0,
                height: 0
            },
            options: true, // optional iOS
            animated: true // optional iOS
        });
    }
    cleanScans() {
        clearObservableArray(this.scans);
        appSettings.remove("scans");
    }
}
