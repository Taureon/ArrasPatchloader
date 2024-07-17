// ==UserScript==
// @name         Arras.io Patchloader
// @namespace    arras.io.patchloader
// @version      2024-07-17
// @description  An userscript that loads script patches for Arras.io
// @author       https://github.com/Taureon, https://github.com/Ric3cir121
// @match        *://arras.io/mod*
// @icon         https://arras.io/favicon/base.svg
// @grant        none
// @downloadURL https://raw.githubusercontent.com/Taureon/ArrasPatchloader/main/patchloader.user.js
// @updateURL https://raw.githubusercontent.com/Taureon/ArrasPatchloader/main/patchloader.meta.js
// ==/UserScript==

window.arrasModules = undefined;

(async function() {
    'use strict';
    if (!['/mod', '/mod/'].includes(window.location.pathname)) return;
    window.history.pushState({}, null, '/mod/' + window.location.hash);

    let listValues, getValue, setValue, deleteValue;

    try {
        listValues = GM_listValues;
        getValue = GM_getValue;
        setValue = GM_setValue;
        deleteValue = GM_deleteValue;
    } catch (err) {
        try {
            ({ listValues, getValue, setValue, deleteValue } = GM ?? {});
        } catch (err) {
            // TODO: should we default to functions that return empty arrays/objects or should we throw an error?
            console.log("L");
        }
    }

    async function getPatchModules () {
        let patches = [];
            keyNameList = await listValues();

        await Promise.all(keyNameList.map(async keyName => {
            let patch = await getValue(keyName);
            patch.patchModuleStoreId = keyName;
            patches.push(patch);
        }));

        return patches;
    }

    function addPatchModule (patch) {
        setValue(Math.random().toString().slice(2), patch);
    }

    function removePatchModule (patchModuleStoreId) {
        deleteValue(patchModuleStoreId);
    }

    function patchReplace (main_script, patch) {
        let searchValue, replaceValue;

        switch (patch.searchMode) {
            case 'string': searchValue = patch.searchValue; break;
            case 'regex': searchValue = new RegExp(...patch.searchValue); break;
            default: throw new Error(`searchMode "${patch.searchMode}" does not exist or is otherwise written incorrectly`);
        }

        switch (patch.replaceMode) {
            case 'string': replaceValue = patch.replaceValue; break;
            case 'function': replaceValue = new Function(...patch.replaceValue); break;
            default: throw new Error(`replaceMode "${patch.replaceMode}" does not exist or is otherwise written incorrectly`);
        }

        if (patch.all) {
            main_script.textContent = main_script.textContent.replaceAll(searchValue, replaceValue);
        } else {
            main_script.textContent = main_script.textContent.replace(searchValue, replaceValue);
        }
    }

    let prepends = [], appends = [];
    function patchPrepend (patch) { prepends.push(patch.prependValue); }
    function patchAppend (patch) { appends.push(patch.appendValue); }

    function patchFunction (main_script, data) {
        let func = new Function(...data.func);
        main_script.textContent = func(main_script.textContent);
    }

    function applyPatch (main_script, { type, data }) {
        switch (type) {
            case 'replace': return patchReplace(main_script, data);
            case 'prepend': return patchPrepend(data);
            case 'append': return patchAppend(data);
            case 'function': return patchFunction(main_script, data);
            default: throw new Error(`type "${type}" does not exist or is otherwise written incorrectly`);
        }
    }

    let arras_modules = [{
        name: 'Patchloader Builtin',
        author: 'Taureon, Ric3cir121',
        description: 'Built-in patches to make Arras.io work with the Patchloader',
        url: 'https://github.com/Taureon/ArrasPatchloader',
        patches: [{
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'fetch("./app.wasm")',
                replaceValue: 'fetch("../app.wasm")'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'fetch("/CHANGELOG.md")',
                replaceValue: 'fetch("../CHANGELOG.md")'
            }
        }, {
            type: 'append',
            data: {
                appendValue: `console.log('%c Arras.io Patchloader by Taureon and Ric3cir121 has been loaded! ', 'background: #444; color: #fff; font-size: 2em; font-weight: bold; padding:12px; border-radius:8px; text-shadow: -2px 0 #000, 0 2px #000, 2px 0 #000, 0 -2px #000, -1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000;')`
            }
        }]
    },{
        name: 'Patchloader API',
        author: 'Taureon, Ric3cir121',
        description: 'APIs to make Arras.io interaction with patches easier',
        url: 'https://github.com/Taureon/ArrasPatchloader',
        patches: [{
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'if(!r.isTrusted)return;',
                replaceValue: 'if(arrasDispatchInternalEvent({type:r.type, originalEvent:r}))return;'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'if(t.isTrusted)',
                replaceValue: 'if(arrasDispatchInternalEvent({type:t.type, originalEvent:t}))return;'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 't.isTrusted&&',
                replaceValue: 'if(arrasDispatchInternalEvent({type:t.type, originalEvent:t}))return;'
            }
        }, {
            type: 'append',
            data: {
                appendValue: `
                class ArrasKeyboardEvent {
                    constructor(type, ctrlKey, altKey, shiftKey, metaKey, key, code) {
                        if(type instanceof KeyboardEvent){
                            this.type = type.type;
                            this.ctrlKey = type.ctrlKey;
                            this.altKey = type.altKey;
                            this.shiftKey = type.shiftKey;
                            this.metaKey = type.metaKey;
                            this.key = type.key;
                            this.code = type.code;
                        }else{
                            this.type = type;
                            this.ctrlKey = ctrlKey;
                            this.altKey = altKey;
                            this.shiftKey = shiftKey;
                            this.metaKey = metaKey;
                            this.key = key;
                            this.code = code;
                        }
                    }
                }
                class ArrasMouseEvent {
                    constructor(type, clientX, clientY, button, deltaX, deltaY, deltaMode) {
                        if(type instanceof MouseEvent){
                            this.type = type.type;
                            this.clientX = type.clientX;
                            this.clientY = type.clientY;
                            this.button = type.button;
                            this.deltaX = type.deltaX;
                            this.deltaY = type.deltaY;
                            this.deltaMode = type.deltaMode;
                        }else{
                            this.type = type;
                            this.clientX = clientX;
                            this.clientY = clientY;
                            this.button = button;
                            this.deltaX = deltaX;
                            this.deltaY = deltaY;
                            this.deltaMode = deltaMode;
                        }
                    }
                }
                class ArrasTouchEvent {
                    constructor(type, changedTouches) {
                        if(type instanceof TouchEvent){
                            this.type = type.type;
                            this.changedTouches = [];
                            for(const changedTouch of type.changedTouches){
                                this.changedTouches.push({clientX:changedTouch.clientX, clientY:changedTouch.clientY, identifier:changedTouch.identifier});
                            }
                        }else{
                            this.type = type;
                            this.changedTouches = changedTouches;
                        }
                    }
                }

                function arrasDispatchEvent(event) {
                    if(event instanceof ArrasKeyboardEvent){
                        document.body.dispatchEvent(new KeyboardEvent(event.type,{ctrlKey:event.ctrlKey, altKey:event.altKey, shiftKey:event.shiftKey, metaKey:event.metaKey, key:event.key, code:event.code,
                            bubbles:true, cancelable:true, returnValue:false, view:window, target:document.body}));
                    }else if(event instanceof ArrasMouseEvent){
                        document.getElementById("canvas").querySelector("canvas").dispatchEvent(new MouseEvent(event.type,{clientX:event.clientX, clientY:event.clientY, button:event.button,
                            deltaX:event.deltaX, deltaY:event.deltaY, deltaMode:event.deltaMode, bubbles:true, cancelable: true, returnValue:true, view: window, target:canvas}));
                    }else if(event instanceof ArrasTouchEvent){
                        let changedTouches = [];
                        for(changedTouch of event.changedTouches){
                            changedTouches.push(new Touch({clientX:changedTouch.clientX, clientY:changedTouch.clientY, identifier:changedTouch.identifier, target:canvas}));
                        }
                        document.getElementById("canvas").querySelector("canvas").dispatchEvent(new TouchEvent(event.type,{changedTouches:changedTouches,
                            bubbles:true, cancelable: true, returnValue:true, view: window, target:canvas}));
                    }
                }`
            }
        }, {
            type: 'prepend',
            data: {
                prependValue: `
                let arrasEventListeners = {};
                let arrasEventListenersNonce = 0;
                function arrasDispatchInternalEvent(event){
                    let canceled = false;
                    event.preventDefault = ()=>{canceled = true};
                    if(typeof arrasEventListeners[event.type] !== 'undefined' && Object.keys(arrasEventListeners[event.type]).length > 0){
                        for(const func of Object.values(arrasEventListeners[event.type])){
                            func(event);
                        }
                    }
                    return canceled;
                }
                function arrasAddEventListener(type, func){
                    if(typeof arrasEventListeners[type] === 'undefined'){
                        arrasEventListeners[type] = {}
                    }
                    arrasEventListeners[type][arrasEventListenersNonce] = func;
                    return {type:type, key:arrasEventListenersNonce++};
                }`
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: '(t=e[t]).width=r,t.height=a',
                replaceValue: `(t=e[t]).width=r,t.height=a;
                if(t.parentElement){
                    if(t.parentElement.id == 'canvas'){
                        arrasDispatchInternalEvent({type:'resize', width:r, height:a});
                    }
                }`
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'e[1]||requestAnimationFrame(t)',
                replaceValue: 'arrasDispatchInternalEvent({type:"animationFrame", callback:t});e[1]||requestAnimationFrame(t)'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'e[1]||(document.hidden?requestAnimationFrame(()=>t.port2.postMessage(null)):t.port2.postMessage(null))',
                replaceValue: 'arrasDispatchInternalEvent({type:"animationFrame", callback:t});e[1]||(document.hidden?requestAnimationFrame(()=>t.port2.postMessage(null)):t.port2.postMessage(null))'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: '(t=e[t]).id="canvas",document.body.appendChild(t)',
                replaceValue: '(t=e[t]).id="canvas",document.body.appendChild(t);arrasDispatchInternalEvent({type:"canvas", parent:t, canvas:r})'
            }
        },{
            type: 'append',
            data: {
                appendValue: `
                let getCurrentTheme = undefined;
                let setThemeFromThemeCode = undefined;
                (async function(){
                    let currentTheme = undefined;
                    getCurrentTheme = ()=>{
                        return currentTheme;
                    };
                    setThemeFromThemeCode = (themeCode)=>{
                        const EncodedThemeData = Uint8Array.from(atob(themeCode),x=>x.charCodeAt(0));
                        let i = 6;
                        const read = (n)=>{
                            i += n;
                            return EncodedThemeData.slice(i-n,i);
                        };
                        const decodeString = (uint8Array)=>{
                            return new TextDecoder().decode(uint8Array);
                        };
                        currentTheme = {
                            name: decodeString(read(read(1)[0])),
                            author: decodeString(read(read(1)[0])),
                            colors: {},
                            borders: {}
                        };
                        let colors = Array.from(read(read(1)[0]*3));
                        let borders = Array.from(read(read(1)[0]*3));
                        currentTheme.borders.blendRatio = read(1)/0xff;
                        currentTheme.borders.neonBorders = !!read(1);
                        currentTheme.borders.borders = borders.slice(0,3);

                        let colorNames = [
                            'shieldBars','healthBars','triangles','neutral','hexagons','crashers','eggs','walls','text','borders',
                            'blue','green','red','squares','pentagons','purple','barrels','rogues','background','grid'
                        ]
                        for(let j=0; j<colors.length/3; j++){
                            currentTheme.colors[colorNames[j]] = colors.slice(j*3,j*3+3);
                        }
                        
                    };
                    setThemeFromThemeCode('arras/ABBUxpZ2h0AkNYFHrT27nofueJbf3zgHrbuu+Zw+jr96Skrf///0hISDyky4q8P+A+Qe/HS41q38xmnKenr3Jvb9vb2wAAAAFISEiZAA');
                })();
                `
            }
        }, {
            type: 'append',
            data: {
                appendValue: `
                (async function(){
                    arrasAddEventListener('canvas',async function(event){
                        let canvasDiv = document.createElement('div');
                        canvasDiv.style['z-index'] = '2';
                        canvasDiv.id = 'patchLoaderCanvas';
                        document.body.appendChild(canvasDiv);

                        let canvas = document.createElement('canvas');
                        canvas.width = '0';
                        canvas.height = '0';
                        canvas.style.left = '0';
                        canvas.style.top = '0';
                        canvas.style.position = 'absolute';
                        canvas.style['background-color'] = '#00000000';
                        document.getElementById('patchLoaderCanvas').appendChild(canvas);
                    });
                    arrasAddEventListener('resize', (event)=>{
                        if(document.getElementById('patchLoaderCanvas') && document.getElementById('patchLoaderCanvas').querySelectorAll('canvas').length > 0){
                            let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                            canvas.width = event.width;
                            canvas.height = event.height;
                        }
                    });
                    let toCssColor = (color)=>{return 'rgb'+(color.length==4?'a':'')+'('+color.join(',')+')';};
                    let multiplyColor = (color,quantity)=>{return color.map((val,i) => val*quantity);};
                    let optionsOpen = false;
                    let optionsAnimations = {closed: 0, open: -600, tab: 75, tabHeight: 0, tabDisplayHeight: 0};
                    let selectedTab = 0;
                    let displayTab = 0;
                    let interfaceSize = 1;
                    let interfaceScale = interfaceSize;
                    let lineWidth = 3;
                    let colors = getCurrentTheme().colors;
                    let menuTabs = [{
                        name:'Options',
                        click:[100,50],
                        useExistingTab: true,
                        height: 18*40+10
                    },{
                        name:'Theme',
                        click:[255,50],
                        useExistingTab: true,
                        height: 15*40+10
                    },{
                        name:'Keybinds',
                        click:[365,50],
                        useExistingTab: true,
                        height: 16*40+10
                    },{
                        name:'Secrets',
                        click:[455,50],
                        useExistingTab: true,
                        height: 9*40+10
                    },{
                        name:'Patches',
                        click:[455,50],
                        useExistingTab: false,
                        height: 9*40+10,
                        options: undefined
                    },{
                        name:'Elements',
                        click:[455,50],
                        useExistingTab: false,
                        height: 9*40+10,
                        options: [[{
                            type:'title',
                            data:{
                                text:'Text'
                            }
                        }],[{
                            type:'text',
                            data:{
                                text:'Text',
                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'checkbox',
                            data:{
                                text: 'Text',
                                callback: (checked) => {},
                                value: false,

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'slider',
                            data:{
                                text: 'Text',
                                callback: (value) => {},
                                value: 0,
                                minimumValue: 0,
                                maximumValue: 1,

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'textInput',
                            data:{
                                callback: (text) => {},
                                value: 'Text',
                                numbersOnly: false,
                                placeholder: 'Type',

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'dropdown',
                            data:{
                                callback: (option) => {},
                                value: 'Option',
                                options: {
                                    0: 'Option',
                                    1: 'Other option'
                                },

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'button',
                            data:{
                                text: 'Text',
                                callback: () => {},

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'empty',
                            data:{
                                columnSpan: 1
                            }
                        }],[{
                            type:'keybind',
                            data:{
                                text: 'Text',
                                callback: (key) => {},
                                value: 'A',
                                allowsMultipleKeys: false,

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }],[{
                            type:'color',
                            data:{
                                text: 'Text',
                                callback: (color) => {},
                                value: [0, 0, 0],
                                hasOpacity: false,

                                requiresReload: false,
                                isDisabled: false,

                                hoverText: 'Text',
                                columnSpan: 1
                            }
                        }]]
                    },{
                        name:'YT Options',
                        click:[455,50],
                        useExistingTab: false,
                        height: 9*40+10,
                        options: [[{
                            type:'title',
                            data:{text:'General'}
                        }],[{
                            type:'checkbox',
                            data:{text:'Noclip'}
                        },{
                            type:'checkbox',
                            data:{text:'No HitBox'}
                        }],[{
                            type:'checkbox',
                            data:{text:'No Recoil'}
                        },{
                            type:'checkbox',
                            data:{text:'Invisibility'}
                        }],[{
                            type:'title',
                            data:{text:'Players'}
                        }],[{
                            type:'dropdown',
                            data:{
                                value: '0',
                                options:{
                                    '0': 'Sandbox status (you)'
                                },
                                columnSpan: 1
                            }
                        }],[{
                            type:'button',
                            data:{text:'OP'}
                        },{
                            type:'button',
                            data:{text:'DeOP'}
                        },{
                            type:'button',
                            data:{text:'Kill'}
                        },{
                            type:'button',
                            data:{text:'Ban'}
                        }],[{
                            type:'button',
                            data:{text:'Teleport here'}
                        },{
                            type:'button',
                            data:{text:'Teleport to'}
                        }],[{
                            type:'checkbox',
                            data:{text:'Move to target',columnSpan:3}
                        },{
                            type:'checkbox',
                            data:{text:'Shoot target',columnSpan:3}
                        },{
                            type:'button',
                            data:{text:'Select',columnSpan:2}
                        }],[{
                            type:'title',
                            data:{text:'Spawn Poligons'}
                        }],[{
                            type:'dropdown',
                            data:{
                                value: '0',
                                options:{
                                    '0': 'Egg',
                                    '4': 'Square',
                                    '8': 'Triangle',
                                    '12': 'Pentagon',
                                    '18': 'Hexagon',
                                    '22': 'Heptagon',
                                    '26': 'Octagon',
                                    '30': 'Nonagon',
                                    '34': 'Gem',
                                    '35': 'Gem',
                                    '36': 'Relic',
                                    '37': 'Relic',
                                    '38': 'Relic',
                                    '39': 'Cube',
                                    '40': 'Icosahedron',
                                    '41': 'Dodecahedron'
                                },
                                columnSpan: 3
                            }
                        },{
                            type:'dropdown',
                            data:{
                                value: '0',
                                options:{
                                    '0': 'Regular',
                                    '1': 'Beta',
                                    '2': 'Alpha',
                                    '3': 'Crasher',
                                    '4': 'Old Beta',
                                    '5': 'Old Alpha'
                                },
                                columnSpan: 2
                            }
                        },{
                            type:'dropdown',
                            data:{
                                value: '0',
                                options:{
                                    '0': 'Regular',
                                    '1': 'Shiny',
                                    '2': 'Legendary',
                                    '3': 'Shadow',
                                    '4': 'Rainbow',
                                    '5': 'Trans'
                                },
                                columnSpan: 2
                            }
                        }],[{
                            type:'textInput',
                            data:{value:'x1',columnSpan: 3}
                        },{
                            type:'button',
                            data:{text:'Spawn',columnSpan: 4}
                        }],[{
                            type:'title',
                            data:{text:'Sandbox Settings'}
                        }],[{
                            type:'textInput',
                            data:{value:'40x40',columnSpan:2}
                        },{
                            type:'button',
                            data:{text:'Set Size'}
                        },{
                            type:'button',
                            data:{text:'Reset'}
                        }],[{
                            type:'dropdown',
                            data:{value:'-1',columnSpan:2}
                        },{
                            type:'button',
                            data:{text:'Spawn Team'}
                        },{
                            type:'button',
                            data:{text:'Set for everyone'}
                        }],[{
                            type:'textInput',
                            data:{value:'',placeHolder:'Enter a number (0-250)...'}
                        },{
                            type:'button',
                            data:{text:'Set max. Polygons'}
                        }],[{
                            type:'button',
                            data:{text:'Restart the Server'}
                        }],[{
                            type:'title',
                            data:{text:'Game Rules'}
                        }],[{
                            type:'dropdown',
                            data:{
                                value:'0',
                                options:{
                                    '0':'FFA',
                                    '1':'2TDM',
                                    '2':'3TDM',
                                    '3':'4TDM',
                                    '4':'Duos',
                                    '5':'Squads',
                                    '6':'Clan wars'
                                }
                            }
                        },{
                            type:'dropdown',
                            data:{
                                value:'0',
                                options:{
                                    '0':'No Custom Mode',
                                    '1':'Dreadnoughts',
                                    '2':'Old Dreadnoughts',
                                    '3':'Arms Race',
                                    '4':'Growth',
                                    '5':'Overgrowth',
                                    '6':'Magic Maze',
                                    '7':'Manhunt',
                                    '8':'Succer',
                                    '9':'Mothership',
                                    '10':'Train Wars',
                                    '11':'Skinwalkers'
                                }
                            }
                        }],[{
                            type:'dropdown',
                            data:{
                                value:'0',
                                options:{
                                    '0':'Siege Off',
                                    '1':'Siege Blitz',
                                    '2':'Siege Citadel'
                                }
                            }
                        },{
                            type:'dropdown',
                            data:{
                                value:'0',
                                options:{
                                    '0':'Assault Off',
                                    '1':'Assault Bastion',
                                    '1':'Assault Booster'
                                }
                            }
                        }],[{
                            type:'checkbox',
                            data:{text:'Maze'}
                        },{
                            type:'checkbox',
                            data:{text:'Spawn bosses'}
                        }],[{
                            type:'checkbox',
                            data:{text:'Outbreak'}
                        }],[{
                            type:'title',
                            data:{text:'Other'}
                        }],[{
                            type:'dropdown',
                            data:{
                                value: '-1',
                                options:{
                                    '-1': 'Blue Base Field (Team -1)',
                                    '-2': 'Red Base Field (Team -2)',
                                    '-3': 'Green Base Field (Team -3)',
                                    '-4': 'Purple Base Field (Team -4)',
                                    '-5': 'Neutral Base Field (Team -5)',
                                },
                                columnSpan:2
                            }
                        },{
                            type:'button',
                            data:{text:'Select Zone'}
                        },{
                            type:'button',
                            data:{text:'Set Zone'}
                        }],[{
                            type:'textInput',
                            data:{value:'9x',columnSpan:2}
                        },{
                            type:'button',
                            data:{text:'Add Points'}
                        },{
                            type:'button',
                            data:{text:'Set Stats'}
                        }],[{
                            type:'textInput',
                            data:{value:'',placeHolder:'Enter a message...'}
                        },{
                            type:'button',
                            data:{text:'Broadcast'}
                        }]]
                    }];
                    let glowingTabs = {};
                    let clickButtonIds = {};
                    let lastUpdate = undefined;

                    const fillRect = (ctx, position, color)=>{
                        ctx.beginPath();
                        ctx.rect(position[0], position[1], position[2], position[3]);
                        ctx.fillStyle = color;
                        ctx.fill();
                        ctx.closePath();
                    };
                    const strokeRect = (ctx, position, color)=>{
                        ctx.beginPath();
                        ctx.rect(position[0], position[1], position[2], position[3]);
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.lineWidth = lineWidth*interfaceScale;
                        ctx.strokeStyle = color;
                        ctx.stroke();
                        ctx.closePath();
                    };
                    const drawRect = (ctx, position, fillColor, strokeColor)=>{
                        fillRect(ctx, position, fillColor);
                        strokeRect(ctx, position, strokeColor);
                    };
                    const fillText = (ctx, text, position, fontSize, textAlign, color)=>{
                        ctx.font = 'bold '+fontSize*interfaceScale+'px / '+fontSize*(25.6/15)*interfaceScale+'px Ubuntu';
                        ctx.textAlign = textAlign;
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = color;
                        ctx.fillText(text, position[0], position[1]);
                    }
                    const strokeText = (ctx, text, position, fontSize, strokeSize, textAlign, color)=>{
                        ctx.font = 'bold '+fontSize*interfaceScale+'px / '+fontSize*(25.6/15)*interfaceScale+'px Ubuntu';
                        ctx.lineWidth = strokeSize*interfaceScale;
                        ctx.textAlign = textAlign;
                        ctx.textBaseline = 'middle';
                        ctx.strokeStyle = color;
                        ctx.strokeText(text, position[0], position[1]);
                    }
                    const drawText = (ctx, text, position, fontSize, strokeSize, textAlign, fillColor, strokeColor)=>{
                        strokeText(ctx, text, position, fontSize, strokeSize, textAlign, strokeColor);
                        fillText(ctx, text, position, fontSize, textAlign, fillColor);
                    }

                    function getOptionsHeight(options){
                        return options.length*40+10;
                    }
                    function drawOptions(canvas, options, opacity){
                        let ctx = canvas.getContext("2d");
                        const scale = interfaceScale;

                        for(let i=0; i<options.length; i++){
                            const row = options[i];
                            let column = 0;
                            let columns = 0;
                            for(let j=0; j<row.length; j++){
                                columns += (row[j].data??{}).columnSpan??1;
                            }
                            for(let j=0; j<row.length; j++){
                                const element = row[j];
                                const posX = 15*column + (420-15*(columns-1))*(column/columns);
                                const columnSpan = (element.data??{}).columnSpan??1;
                                const width = 15*(columnSpan-1) + (420-15*(columns-1))*(columnSpan/columns);

                                if(element.type == 'title'){
                                    const text = element.data.text;
                                    drawText(ctx, text, [(209.5+45+optionsAnimations.open)*scale, (i*40+100-1)*scale], 17, lineWidth+.5, 'center',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'text'){
                                    const text = element.data.text;
                                    drawText(ctx, text, [(posX+45+optionsAnimations.open)*scale, (i*40+100-6.5)*scale], 15, lineWidth, 'left',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'checkbox'){
                                    const text = element.data.text;
                                    const value = element.data.value;
                                    const hover = element.data.hover??0;

                                    fillRect(ctx,
                                        [(posX+45+optionsAnimations.open)*scale, (i*40+80)*scale, 25*scale, 25*scale],
                                        toCssColor((value?colors.green:colors.text).concat([opacity]))
                                    );

                                    const greenTextMatch = ((a,b)=>{return a[0]==b[0]&&a[1]==b[1]&&a[2]==b[2];})(colors.green, colors.text)
                                    drawRect(ctx,
                                        [(posX+45+optionsAnimations.open)*scale, (i*40+80)*scale, 25*scale, 25*scale],
                                        toCssColor((value && hover==1 && !greenTextMatch ? colors.text:colors.borders).concat([opacity*([0x00, 0x25, 0x4b][hover])/0xff])),
                                        toCssColor(colors.borders.concat([opacity]))
                                    );

                                    if(value){
                                        ctx.beginPath();
                                        ctx.lineWidth = lineWidth;
                                        ctx.lineCap = 'round';
                                        ctx.lineJoin = 'round';
                                        ctx.strokeStyle = toCssColor(colors.text);
                                        ctx.moveTo((posX+ 5.75 +45+optionsAnimations.open)*scale, (i*40+80+14.5)*scale);
                                        ctx.lineTo((posX+ 9.5 +45+optionsAnimations.open)*scale, (i*40+80+18.25   )*scale);
                                        ctx.lineTo((posX+19.5 +45+optionsAnimations.open)*scale, (i*40+80+ 8.25   )*scale);
                                        ctx.stroke();
                                        ctx.closePath();
                                    }

                                    drawText(ctx, text, [(posX+35 +45+optionsAnimations.open)*scale, (i*40+100-6.5)*scale], 15, lineWidth, 'left',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'slider'){
                                    const text = element.data.text;
                                    const value = element.data.value;
                                    const minimumValue = element.data.minimumValue;
                                    const maximumValue = element.data.maximumValue;

                                    const sliderPercentage = (value-minimumValue)/(maximumValue-minimumValue);

                                    fillRect(ctx, [(posX +45+optionsAnimations.open)*scale, (i*40+80+2.5)*scale, 150*scale, 20*scale], toCssColor(colors.text.concat([opacity])));
                                    fillRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80+2.5)*scale, sliderPercentage*137.5*scale, 20*scale],
                                        toCssColor(colors.green.concat([opacity*0xb2/0xff]))
                                    );
                                    strokeRect(ctx, [(posX +45+optionsAnimations.open)*scale, (i*40+80+2.5)*scale, 150*scale, 20*scale], toCssColor(colors.borders.concat([opacity])));

                                    drawRect(ctx,
                                        [(posX+sliderPercentage*137.5 +45+optionsAnimations.open)*scale, (i*40+80)*scale, 12.5*scale, 25*scale],
                                        toCssColor(colors.green.concat([opacity])),
                                        toCssColor(colors.borders.concat([opacity]))
                                    );

                                    drawText(ctx, text, [(posX+160 +45+optionsAnimations.open)*scale, (i*40+100-6.5)*scale], 15, lineWidth, 'left',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'textInput'){
                                    const value = element.data.value;
                                    const placeHolder = element.data.placeHolder??'';

                                    drawRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, width*scale, 25*scale],
                                        toCssColor(colors.text.concat([opacity])),
                                        toCssColor(colors.borders.concat([opacity]))
                                    );

                                    if(value != ''){
                                        fillText(ctx, value, [(posX+12.5 +45+optionsAnimations.open)*scale, (i*40+100-5.5)*scale], 12.5, 'left',
                                            toCssColor(colors.borders.concat([opacity])));
                                    }else{
                                        fillText(ctx, placeHolder, [(posX+12 +45+optionsAnimations.open)*scale, (i*40+100-6.5)*scale], 12.5, 'left',
                                            toCssColor(colors.borders.concat([opacity*0x65/0xff])));
                                    }
                                }else if(element.type == 'dropdown'){
                                    const value = element.data.value;

                                    drawRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, width*scale, 25*scale],
                                        toCssColor(colors.text.concat([opacity])),
                                        toCssColor(colors.borders.concat([opacity]))
                                    );

                                    ctx.beginPath();
                                    ctx.lineWidth = 0;
                                    ctx.fillStyle = toCssColor(colors.borders);
                                    ctx.moveTo((posX+width-21.25 +45+optionsAnimations.open)*scale, (i*40+90- .625)*scale);
                                    ctx.lineTo((posX+width-15    +45+optionsAnimations.open)*scale, (i*40+90+5.625)*scale);
                                    ctx.lineTo((posX+width- 8.75 +45+optionsAnimations.open)*scale, (i*40+90- .625)*scale);
                                    ctx.fill();
                                    ctx.closePath();
                                    
                                    drawText(ctx, value, [(posX+12.5 +45+optionsAnimations.open)*scale, (i*40+100-7.5)*scale], 12.5, lineWidth-.5, 'left',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'button'){
                                    const text = element.data.text;
                                    const hover = element.data.hover??0;

                                    fillRect(ctx, [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, width*scale, 25*scale], toCssColor(colors.barrels.concat([opacity])));

                                    fillRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80+15)*scale, width*scale, 10*scale],
                                        toCssColor(colors.borders.concat([opacity*0x32/0xff]))
                                    );

                                    fillRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, width*scale, (hover==2?15:25)*scale],
                                        toCssColor((hover==1 ? colors.text:colors.borders).concat([opacity*([0x00, 0x25, 0x65][hover])/0xff]))
                                    );

                                    strokeRect(ctx, [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, width*scale, 25*scale], toCssColor(colors.borders.concat([opacity])));

                                    drawText(ctx, text, [(posX+width/2 +45+optionsAnimations.open)*scale, (i*40+100-7.5)*scale], 12.5, lineWidth-.5, 'center',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'keybind'){
                                    const text = element.data.text;
                                    const value = element.data.value;

                                    drawRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, 25*scale, 25*scale],
                                        toCssColor(colors.text.concat([opacity])),
                                        toCssColor(colors.borders.concat([opacity]))
                                    );
                                    fillText(ctx, value, [(posX+12.5 +45+optionsAnimations.open)*scale, (i*40+100-7.5)*scale], 15, 'center',
                                        toCssColor(colors.borders.concat([opacity])));

                                    drawText(ctx, text, [(posX+35 +45+optionsAnimations.open)*scale, (i*40+100-6.5)*scale], 15, lineWidth, 'left',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }else if(element.type == 'color'){
                                    const text = element.data.text;
                                    const value = element.data.value;
                                    const hasOpacity = element.data.hasOpacity;

                                    drawRect(ctx,
                                        [(posX +45+optionsAnimations.open)*scale, (i*40+80)*scale, 25*scale, 25*scale],
                                        toCssColor(value.slice(0,3).concat([opacity*(hasOpacity?value[3]:1)])),
                                        toCssColor(colors.borders.concat([opacity]))
                                    );

                                    drawText(ctx, text, [(posX+35 +45+optionsAnimations.open)*scale, (i*40+100-6.5)*scale], 15, lineWidth, 'left',
                                        toCssColor(colors.text.concat([opacity])) , toCssColor(colors.borders.concat([opacity])));
                                }
                                column += columnSpan;
                            }
                        }
                    }
                    arrasAddEventListener('animationFrame', ()=>{
                        if(!document.getElementById('patchLoaderCanvas') || document.getElementById('patchLoaderCanvas').querySelectorAll('canvas').length <= 0){return;}

                        let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                        let ctx = canvas.getContext("2d");
                        const scale = interfaceScale;

                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        if(!lastUpdate){
                            lastUpdate = Date.now();
                        }
                        let deltaTime = (Date.now()-lastUpdate)/1000;
                        lastUpdate = Date.now();

                        /*
                            Size of the user interface:
                            Small:   scale = 0.75;
                            Regular: scale = 1;
                            Large:   scale = 1.25;
                            Mobile:  scale = 1.5;
                        */
                        interfaceScale = interfaceSize*Math.max(canvas.width/1920,canvas.height/1080);

                        let arrasApproach = (position, destination)=>{
                            const distance = Math.abs(destination-position);
                            let base   = 5;
                            let amount = distance > 512 ? 0.2048 : (distance > 128 ? 0.256 : (distance > 32 ? 0.32 : (distance > 8 ? 0.4 : 0.5)));
                            amount = 0.5*Math.pow(0.8, Math.ceil(Math.log(Math.max(distance,8))/Math.log(4)-1.5));
                            amount = Math.min(Math.log(4)/Math.log(distance+16)*.97,.4);
                            amount = 1-Math.pow(1-amount, 30*deltaTime);
                            amount *= (destination-position);
                            if(Math.abs(amount) > distance){
                                return position+distance;
                            }
                            return position+amount;
                        }

                        optionsAnimations.open = arrasApproach(optionsAnimations.open, optionsOpen?0:-540);
                        optionsAnimations.closed = arrasApproach(optionsAnimations.closed, optionsOpen?-200:0);
                        optionsAnimations.tab = arrasApproach(optionsAnimations.tab, selectedTab/menuTabs.length*410+75);
                        displayTab = (optionsAnimations.tab-75)/410*menuTabs.length;

                        if(optionsOpen && Math.round(displayTab) == 1){
                            for(input of document.body.querySelectorAll('input')){
                                if(input.value.includes('arras/')){
                                    setThemeFromThemeCode(input.value);
                                    colors = getCurrentTheme().colors;
                                }
                            }
                        }

                        if(!menuTabs[4].options){
                            let patchesOptions = [
                                [{
                                    type: 'title',
                                    data:{
                                        text: 'Patches'
                                    }
                                },{
                                }],[{
                                    type: 'checkbox',
                                    data:{
                                        callback: (checked)=>{},
                                        requiresReload: true,
                                        text: 'Enable Patches',
                                        value: true
                                    }
                                },{
                                    type: 'text',
                                    data:{
                                        text: 'Generic text'
                                    }
                                }],
                                [{
                                    type: 'title',
                                    data:{
                                        text: 'Add a patch'
                                    }
                                },{
                                }],[{
                                    type: 'textInput',
                                    data:{
                                        callback: (checked)=>{},
                                        requiresReload: true,
                                        value: '',
                                        placeHolder: 'Type the url here...',
                                        columnSpan: 3
                                    }
                                },{
                                    type: 'button',
                                    data:{
                                        text: 'Add from url',
                                        columnSpan: 1
                                    }
                                }],[{
                                    type: 'text',
                                    data:{
                                        text: 'No file chosen',
                                        columnSpan: 2
                                    }
                                },{
                                    type: 'button',
                                    data:{
                                        text: 'Choose file',
                                        columnSpan: 1
                                    }
                                },{
                                    type: 'button',
                                    data:{
                                        text: 'Add from file',
                                        columnSpan: 1
                                    }
                                }]
                            ];
                            for(const module of arrasModules){
                                patchesOptions.push([{type:'title',data:{text: module.name }}]);
                                patchesOptions.push([{
                                    type:'text',
                                    data:{text:'Author: '+module.author}
                                }]);
                                patchesOptions.push([{
                                    type:'text',
                                    data:{text:'Description: '+module.description}
                                }]);
                                patchesOptions.push([{
                                    type:'checkbox',
                                    data:{
                                        callback: (checked)=>{},
                                        text:'Enabled',
                                        value: true
                                    }
                                }]);
                            }
                            menuTabs[4].options = patchesOptions;
                        }

                        let leftTab  = menuTabs[Math.floor(displayTab)];
                        let rightTab = menuTabs[Math.ceil (displayTab)];
                        let height = leftTab.height * (1-displayTab%1) + rightTab.height * (  displayTab%1);
                        let displayHeight  = Math.max(leftTab .useExistingTab ? 0 : getOptionsHeight(leftTab .options), leftTab .height) * (1-displayTab%1);
                            displayHeight += Math.max(rightTab.useExistingTab ? 0 : getOptionsHeight(rightTab.options), rightTab.height) * (  displayTab%1);

                        height = optionsAnimations.tabHeight -= (optionsAnimations.tabHeight-height)*.1;
                        displayHeight = optionsAnimations.tabDisplayHeight -= (optionsAnimations.tabDisplayHeight-displayHeight)*.1;

                        if(!(leftTab.useExistingTab && rightTab.useExistingTab)){
                            let opacity = 1;
                            if(menuTabs[Math.round(displayTab)].useExistingTab){
                                opacity = Math.abs(displayTab-Math.round(displayTab))*2;
                            }
                            fillRect(ctx, [(25+5+optionsAnimations.open)*scale, (75+5)*scale, (460-10)*scale, (height-10)*scale], toCssColor(colors.barrels.concat([opacity])));
                            fillRect(ctx, [(25+optionsAnimations.open)*scale, (75-15+height)*scale, 460*scale, (displayHeight-height+15)*scale], toCssColor(colors.barrels));

                            if(!menuTabs[Math.round(displayTab)].useExistingTab){
                                drawOptions(canvas, menuTabs[Math.round(displayTab)].options, 1-Math.abs(displayTab-Math.round(displayTab))*2);
                            }

                            fillRect(ctx, [(25+optionsAnimations.open)*scale, (75-15+displayHeight)*scale, 460*scale, 15*scale], toCssColor(colors.barrels));

                            ctx.beginPath();
                            ctx.lineWidth = lineWidth*scale;
                            ctx.strokeStyle = toCssColor(colors.borders);
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.moveTo((25+optionsAnimations.open)*scale,(75-15+height)*scale);
                            ctx.lineTo((25+optionsAnimations.open)*scale,(75+displayHeight)*scale);
                            ctx.lineTo((485+optionsAnimations.open)*scale,(75+displayHeight)*scale);
                            ctx.lineTo((485+optionsAnimations.open)*scale,(75-15+height)*scale);
                            ctx.stroke();
                        }

                        fillRect(ctx, [(75+optionsAnimations.open)*scale, 25*scale, 410*scale, 50*scale], toCssColor(colors.barrels));
                        fillRect(ctx, [(75+optionsAnimations.open)*scale, 25*scale, 410*scale, 50*scale], toCssColor(colors.borders.concat([0x33/0xff])));

                        for(glowingTab of Object.values(glowingTabs)){
                            if(glowingTab != -1){
                                let leftMenuTabEdge = (glowingTab/menuTabs.length*410+75)+optionsAnimations.open,
                                    rightMenuTabEdge = leftMenuTabEdge+(410/menuTabs.length);
                                fillRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(colors.barrels));
                                fillRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(colors.text.concat([0x25/0xff])));
                            }
                        }
                        for(clickButtonId of Object.values(clickButtonIds)){
                            if(clickButtonId >= 1 && clickButtonId <= menuTabs.length){
                                let leftMenuTabEdge = ((clickButtonId-1)/menuTabs.length*410+75)+optionsAnimations.open,
                                    rightMenuTabEdge = leftMenuTabEdge+(410/menuTabs.length);
                                fillRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(colors.barrels));
                                fillRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(colors.borders.concat([0x6f/0xff])));
                            }
                        }

                        for(let i=0; i<menuTabs.length; i++){
                            if(i != menuTabs.length-1){
                                ctx.beginPath();
                                ctx.lineWidth = lineWidth*scale;
                                ctx.strokeStyle = toCssColor(colors.borders);
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                const lineX = (75+optionsAnimations.open+(410/(menuTabs.length))*(i+1))*scale;
                                ctx.moveTo(lineX,25*scale);
                                ctx.lineTo(lineX,75*scale);
                                ctx.stroke();
                            }
                        }

                        let leftMenuTabEdge = optionsAnimations.tab+optionsAnimations.open,
                            rightMenuTabEdge = leftMenuTabEdge+(410/menuTabs.length);

                        fillRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, (50+lineWidth/2)*scale+1], toCssColor(colors.barrels));

                        ctx.beginPath();
                        ctx.lineWidth = lineWidth*scale;
                        ctx.strokeStyle = toCssColor(colors.borders);
                        ctx.lineCap = 'round';
                        ctx.linejoin = 'round';
                        ctx.moveTo(leftMenuTabEdge*scale,25*scale);
                        ctx.lineTo(leftMenuTabEdge*scale,75*scale);
                        ctx.lineTo((75+optionsAnimations.open)*scale,75*scale);
                        ctx.lineTo((75+optionsAnimations.open)*scale,25*scale);
                        ctx.lineTo((485+optionsAnimations.open)*scale,25*scale);
                        ctx.lineTo((485+optionsAnimations.open)*scale,(75+lineWidth+1)*scale);
                        ctx.stroke();
                        ctx.moveTo((485+optionsAnimations.open)*scale,75*scale);
                        ctx.lineTo(rightMenuTabEdge*scale,75*scale);
                        ctx.lineTo(rightMenuTabEdge*scale,25*scale);
                        ctx.stroke();

                        for(let i=0; i<menuTabs.length; i++){
                            let text = menuTabs[i].name;
                            drawText(ctx, text, [(75+optionsAnimations.open+410/menuTabs.length*(i+.5))*scale, 50*scale], 15, lineWidth, 'center',
                                toCssColor(colors.text), toCssColor(colors.borders));
                        }
                    });
                    function inputDown(identifier, event){
                        clickButtonIds[identifier] = -1;
                        if((!event.originalEvent.isTrusted && identifier == 'mouse') || identifier == 4096)return;

                        let isCursorInsideRect = (cursor, rect)=>{return (cursor.clientX>=rect[0] && cursor.clientX<rect[2])&&(cursor.clientY>=rect[1] && cursor.clientY<rect[3]);};
                        let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                        const scale = interfaceScale*innerWidth/canvas.width;
                        if(optionsOpen){
                            if(isCursorInsideRect(event.originalEvent,[(75+optionsAnimations.open)*scale,25*scale,(485+optionsAnimations.open)*scale,75*scale])){
                                event.preventDefault();
                                clickButtonIds[identifier] = Math.floor((event.originalEvent.clientX-(75+optionsAnimations.open)*scale)/(410/menuTabs.length*scale));
                                clickButtonIds[identifier] = Math.min(Math.max(clickButtonIds[identifier],0),menuTabs.length-1)+1;
                            }
                            if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,75*scale,(485+optionsAnimations.open)*scale,(75+optionsAnimations.tabDisplayHeight)*scale])){
                                if(!menuTabs[Math.round(displayTab)].useExistingTab){
                                    event.preventDefault();
                                }
                            }
                            if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,25*scale,(55+optionsAnimations.open)*scale,55*scale])){
                                clickButtonIds[identifier] = 0;
                            }
                            
                            let options = menuTabs[Math.round(displayTab)].options??[];
                            let thisButtonId = menuTabs.length+1;
                            for(let i=0; i<options.length; i++){
                                const row = options[i];
                                let column = 0;
                                let columns = 0;
                                for(let j=0; j<row.length; j++){
                                    columns += (row[j].data??{}).columnSpan??1;
                                }
                                for(let j=0; j<row.length; j++){
                                    const element = row[j];
                                    const posX = 15*column + (420-15*(columns-1))*(column/columns);
                                    const columnSpan = (element.data??{}).columnSpan??1;
                                    const width = 15*(columnSpan-1) + (420-15*(columns-1))*(columnSpan/columns);
    
                                    if(element.type == 'title'){
                                    }else if(element.type == 'text'){
                                    }else if(element.type == 'checkbox'){
                                        if(isCursorInsideRect(event.originalEvent,
                                            [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+25+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                            ){
                                            clickButtonIds[identifier] = thisButtonId;

                                            element.data.hover = 2;
                                        }
                                    }else if(element.type == 'slider'){
                                        const minimumValue = element.data.minimumValue??0;
                                        const maximumValue = element.data.maximumValue??1;

                                        if(isCursorInsideRect(event.originalEvent,
                                            [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+150+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                            ){
                                            clickButtonIds[identifier] = thisButtonId;

                                            let slider = (event.originalEvent.clientX-(posX+45+6.25+optionsAnimations.open))/137.5;
                                            element.data.value = Math.min(Math.max(minimumValue+slider*(maximumValue-minimumValue),minimumValue),maximumValue);
                                        }
                                    }else if(element.type == 'textInput'){
                                    }else if(element.type == 'dropdown'){
                                    }else if(element.type == 'button'){
                                        if(isCursorInsideRect(event.originalEvent,
                                            [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+width+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                            ){
                                            clickButtonIds[identifier] = thisButtonId;

                                            element.data.hover = 2;
                                        }
                                    }else if(element.type == 'keybind'){
                                    }else if(element.type == 'color'){
                                    }
                                    column += columnSpan;
                                    thisButtonId += 1;
                                }
                            }
                        }else{
                            let atSpawnPage = true;

                            if(isCursorInsideRect(event.originalEvent,[(optionsAnimations.closed)*scale,25*scale,((atSpawnPage?120:20)+optionsAnimations.closed)*scale,55*scale])){
                                clickButtonIds[identifier] = 0;
                            }
                        }
                    }
                    arrasAddEventListener('mousedown', (event)=>{inputDown('mouse', event);});
                    arrasAddEventListener('touchstart', (event)=>{for(i of event.originalEvent.changedTouches){inputDown(i.identifier, {originalEvent:i, preventDefault:event.preventDefault});}});

                    function inputUp(identifier, event){
                        if((!event.originalEvent.isTrusted && identifier == 'mouse') || identifier == 4096)return;

                        let isCursorInsideRect = (cursor, rect)=>{return (cursor.clientX>=rect[0] && cursor.clientX<rect[2])&&(cursor.clientY>=rect[1] && cursor.clientY<rect[3]);};
                        let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                        const scale = interfaceScale*innerWidth/canvas.width;
                        if(optionsOpen){
                            if(isCursorInsideRect(event.originalEvent,[(75+optionsAnimations.open)*scale,25*scale,(485+optionsAnimations.open)*scale,75*scale])){
                                event.preventDefault();
                                let thisClickButtonId = Math.floor((event.originalEvent.clientX-(75+optionsAnimations.open)*scale)/(410/menuTabs.length*scale));
                                thisClickButtonId = Math.min(Math.max(thisClickButtonId,0),menuTabs.length-1)+1;
                                if(clickButtonIds[identifier] == thisClickButtonId){
                                    selectedTab = clickButtonIds[identifier]-1;
                                    let clickLocation = menuTabs[selectedTab].click;
                                    let inputdown = new ArrasTouchEvent('touchstart',[{clientX:clickLocation[0]*scale,clientY:clickLocation[1]*scale,identifier:4096}]);
                                    let inputup = new ArrasTouchEvent('touchend',[{clientX:clickLocation[0]*scale,clientY:clickLocation[1]*scale,identifier:4096}]);
                                    if(identifier == 'mouse'){
                                        inputdown = new ArrasMouseEvent('mousedown',clickLocation[0]*scale,clickLocation[1]*scale,0,0,0,1);
                                        inputup = new ArrasMouseEvent('mouseup',clickLocation[0]*scale,clickLocation[1]*scale,0,0,0,1);
                                    }
                                    arrasDispatchEvent(inputdown);
                                    arrasDispatchEvent(inputup);
                                }
                            }
                            if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,75*scale,(485+optionsAnimations.open)*scale,(75+optionsAnimations.tabDisplayHeight)*scale])){
                                if(!menuTabs[Math.round(displayTab)].useExistingTab){
                                    event.preventDefault();
                                }
                            }
                            if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,25*scale,(55+optionsAnimations.open)*scale,55*scale])){
                                if(clickButtonIds[identifier] == 0){
                                    optionsOpen = false;
                                }
                            }
                            
                            let options = menuTabs[Math.round(displayTab)].options??[];
                            let thisButtonId = menuTabs.length+1;
                            for(let i=0; i<options.length; i++){
                                const row = options[i];
                                let column = 0;
                                let columns = 0;
                                for(let j=0; j<row.length; j++){
                                    columns += (row[j].data??{}).columnSpan??1;
                                }
                                for(let j=0; j<row.length; j++){
                                    const element = row[j];
                                    const posX = 15*column + (420-15*(columns-1))*(column/columns);
                                    const columnSpan = (element.data??{}).columnSpan??1;
                                    const width = 15*(columnSpan-1) + (420-15*(columns-1))*(columnSpan/columns);
    
                                    if(element.type == 'title'){
                                    }else if(element.type == 'text'){
                                    }else if(element.type == 'checkbox'){
                                        if(isCursorInsideRect(event.originalEvent,
                                            [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+25+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                            ){
                                            element.data.hover = 1;
                                            if(clickButtonIds[identifier] == thisButtonId){
                                                element.data.value = !element.data.value;
                                            }
                                        }else{
                                            element.data.hover = 0;
                                        }
                                    }else if(element.type == 'slider'){
                                    }else if(element.type == 'textInput'){
                                    }else if(element.type == 'dropdown'){
                                    }else if(element.type == 'button'){
                                        if(isCursorInsideRect(event.originalEvent,
                                            [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+width+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                            ){
                                            element.data.hover = 1;
                                            if(clickButtonIds[identifier] == thisButtonId){
                                                
                                            }
                                        }else{
                                            element.data.hover = 0;
                                        }
                                    }else if(element.type == 'keybind'){
                                    }else if(element.type == 'color'){
                                    }
                                    column += columnSpan;
                                    thisButtonId += 1;
                                }
                            }
                        }else{
                            let atSpawnPage = true;

                            if(isCursorInsideRect(event.originalEvent,[(optionsAnimations.closed)*scale,25*scale,((atSpawnPage?120:20)+optionsAnimations.closed)*scale,55*scale])){
                                if(clickButtonIds[identifier] == 0){
                                    optionsOpen = true;
                                }
                            }
                        }
                        delete clickButtonIds[identifier];
                        if(glowingTabs[identifier]){
                            delete glowingTabs[identifier];
                        }
                    }
                    arrasAddEventListener('mouseup', (event)=>{inputUp('mouse', event);});
                    arrasAddEventListener('touchend', (event)=>{for(i of event.originalEvent.changedTouches){inputUp(i.identifier, {originalEvent:i, preventDefault:event.preventDefault});}});
                    arrasAddEventListener('touchcancel', (event)=>{for(i of event.originalEvent.changedTouches){inputUp(i.identifier, {originalEvent:i, preventDefault:event.preventDefault});}});

                    function inputMove(identifier, event){
                        if((!event.originalEvent.isTrusted && identifier == 'mouse') || identifier == 4096)return;

                        let isCursorInsideRect = (cursor, rect)=>{return (cursor.clientX>=rect[0] && cursor.clientX<rect[2])&&(cursor.clientY>=rect[1] && cursor.clientY<rect[3]);};
                        let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                        const scale = interfaceScale*innerWidth/canvas.width;
                        glowingTabs[identifier] = -1;
                        if(optionsOpen){
                            if(isCursorInsideRect(event.originalEvent,[(75+optionsAnimations.open)*scale,25*scale,(485+optionsAnimations.open)*scale,75*scale])){
                                glowingTabs[identifier] = Math.floor((event.originalEvent.clientX-(75+optionsAnimations.open)*scale)/(410/menuTabs.length*scale));
                                glowingTabs[identifier] = Math.min(Math.max(glowingTabs[identifier],0),menuTabs.length-1);
                            }
                            if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,75*scale,(485+optionsAnimations.open)*scale,(75+optionsAnimations.tabDisplayHeight)*scale])){
                                if(!menuTabs[Math.round(displayTab)].useExistingTab){
                                    event.preventDefault();
                                    let inputLocation = [event.originalEvent.clientX/scale, Math.round((event.originalEvent.clientY/scale-75)/40)*40+75];
                                    let centeredLocation = [
                                        inputLocation[0] - (innerWidth /interfaceScale)/2,
                                        inputLocation[1] - (innerHeight/interfaceScale)/2
                                    ];
                                    centeredLocation[0] *= (centeredLocation[1]/(event.originalEvent.clientY/scale-(innerHeight/interfaceScale)/2));
                                    inputLocation = [
                                        Math.min(Math.max(centeredLocation[0] + (innerWidth/interfaceScale)/2,inputLocation[0]-50), inputLocation[0]+50),
                                        centeredLocation[1] + (innerHeight/interfaceScale)/2
                                    ];

                                    let inputmove = new ArrasTouchEvent('touchmove',[{clientX:inputLocation[0]*scale,clientY:inputLocation[1]*scale,identifier:4096}]);
                                    if(identifier == 'mouse'){
                                        inputmove = new ArrasMouseEvent('mousemove',inputLocation[0]*scale,inputLocation[1]*scale,0,0,0,1);
                                    }
                                    arrasDispatchEvent(inputmove);
                                }
                            }
                            
                            let options = menuTabs[Math.round(displayTab)].options??[];
                            let thisButtonId = menuTabs.length+1;
                            for(let i=0; i<options.length; i++){
                                const row = options[i];
                                let column = 0;
                                let columns = 0;
                                for(let j=0; j<row.length; j++){
                                    columns += (row[j].data??{}).columnSpan??1;
                                }
                                for(let j=0; j<row.length; j++){
                                    const element = row[j];
                                    const posX = 15*column + (420-15*(columns-1))*(column/columns);
                                    const columnSpan = (element.data??{}).columnSpan??1;
                                    const width = 15*(columnSpan-1) + (420-15*(columns-1))*(columnSpan/columns);
    
                                    if(element.type == 'title'){
                                    }else if(element.type == 'text'){
                                    }else if(element.type == 'checkbox'){
                                        if(element.data.hover != 2){
                                            if(isCursorInsideRect(event.originalEvent,
                                                [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+25+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                                ){
                                                element.data.hover = 1;
                                            }else{
                                                element.data.hover = 0;
                                            }
                                        }
                                    }else if(element.type == 'slider'){
                                        const minimumValue = element.data.minimumValue??0;
                                        const maximumValue = element.data.maximumValue??1;

                                        if(clickButtonIds[identifier] == thisButtonId){
                                            let slider = (event.originalEvent.clientX-(posX+45+6.25+optionsAnimations.open))/137.5;
                                            element.data.value = Math.min(Math.max(minimumValue+slider*(maximumValue-minimumValue),minimumValue),maximumValue);
                                        }
                                    }else if(element.type == 'textInput'){
                                    }else if(element.type == 'dropdown'){
                                    }else if(element.type == 'button'){
                                        if(element.data.hover != 2){
                                            if(isCursorInsideRect(event.originalEvent,
                                                [(posX+45+optionsAnimations.open)*scale,(i*40+80)*scale,(posX+width+45+optionsAnimations.open)*scale,(i*40+105)*scale])
                                                ){
                                                element.data.hover = 1;
                                            }else{
                                                element.data.hover = 0;
                                            }
                                        }
                                    }else if(element.type == 'keybind'){
                                    }else if(element.type == 'color'){
                                    }
                                    column += columnSpan;
                                    thisButtonId += 1;
                                }
                            }
                        }
                    }
                    arrasAddEventListener('mousemove', (event)=>{inputMove('mouse', event);});
                    arrasAddEventListener('touchmove', (event)=>{for(i of event.originalEvent.changedTouches){inputMove(i.identifier, {originalEvent:i, preventDefault:event.preventDefault});}});
                })();`
            }
        }]
    }];
    window.arrasModules = arras_modules;

    //arras_modules.push(...await getPatchModules());

    document.head.innerHTML = '<style>body{background-color:#484848;}</style>';
    document.body.innerHTML = '';

    let main_page = (new DOMParser()).parseFromString(await (await fetch("/")).text(), 'text/html');

    const main_script = document.createElement('script');
    main_script.textContent = main_page.body.querySelector('script').textContent;

    let patchFails = [];

    for (const module of arras_modules) {
        for (const patchIndex in module.patches) {
            try {
                applyPatch(main_script, module.patches[patchIndex]);
            } catch (error) {

                // yell to the end user about it later
                patchFails.push({ module, patchIndex, error });
            }
        }
    }
    main_script.textContent = prepends.join(';') + ';' + main_script.textContent;
    main_script.textContent = main_script.textContent + ';' + appends.join(';');

    if (patchFails.length > 0) {
        console.log(`Attempted to apply all patches, but the following errors occurred:`);
        for (let { module, patchIndex, error } of patchFails) {
            console.log(`
                Module: ${module.name} (Storage ID: ${module.patchModuleStoreId})
                Patch Index: ${patchIndex}
                Error: ${error.message}`);
        }
        console.log(`These were all the errors that occured while applying patches.`);
    } else {
        console.log(`Successfully applied all patches`);
    }

    // note: there is a script that is supposed to run on the head, but it's not
    document.head.innerHTML = main_page.head.innerHTML;
    document.body.innerHTML = '';
    document.body.appendChild(main_script);
})();