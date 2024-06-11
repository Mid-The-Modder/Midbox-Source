// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

//import {Layout} from "./Layout";
import { InstrumentType, EffectType, Config, getPulseWidthRatio, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, effectsIncludeDetune, effectsIncludeVibrato, effectsIncludeNoteFilter, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludeWavefold, effectsIncludePanning, effectsIncludeChorus, effectsIncludeEcho, effectsIncludeReverb, effectsIncludePercussion, DropdownID } from "../synth/SynthConfig";
import { BarScrollBar } from "./BarScrollBar";
import { BeatsPerBarPrompt } from "./BeatsPerBarPrompt";
import { Change, ChangeGroup } from "./Change";
import { ChannelSettingsPrompt } from "./ChannelSettingsPrompt";
import { ColorConfig, ChannelColors } from "./ColorConfig";
import { CustomChipPrompt } from "./CustomChipPrompt";
import { WavetablePrompt } from "./WavetablePrompt";
//import { HarmonicsPrompt } from "./HarmonicsPrompt";
import { KeybindSetupPrompt } from "./KeybindSetupPrompt";
import { CustomFilterPrompt } from "./CustomFilterPrompt";
import { EditorConfig, isMobile, prettyNumber, Preset, PresetCategory } from "./EditorConfig";
import { ExportPrompt } from "./ExportPrompt";
import "./Layout"; // Imported here for the sake of ensuring this code is transpiled early.
import { Instrument, Channel, Synth } from "../synth/synth";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Preferences } from "./Preferences";
import { HarmonicsEditor } from "./HarmonicsEditor";
import { InputBox, Slider } from "./HTMLWrapper";
import { ImportPrompt } from "./ImportPrompt";
import { ChannelRow } from "./ChannelRow";
import { LayoutPrompt } from "./LayoutPrompt";
import { EnvelopeEditor } from "./EnvelopeEditor";
import { FadeInOutEditor } from "./FadeInOutEditor";
import { FilterEditor } from "./FilterEditor";
import { LimiterPrompt } from "./LimiterPrompt";
import { CustomScalePrompt } from "./CustomScalePrompt";
import { RandomGenPrompt } from "./RandomGenPrompt";
import { LoopEditor } from "./LoopEditor";
import { MoveNotesSidewaysPrompt } from "./MoveNotesSidewaysPrompt";
import { MuteEditor } from "./MuteEditor";
import { OctaveScrollBar } from "./OctaveScrollBar";
import { MidiInputHandler } from "./MidiInput";
import { KeyboardLayout } from "./KeyboardLayout";
import { PatternEditor } from "./PatternEditor";
import { Piano } from "./Piano";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { SongDurationPrompt } from "./SongDurationPrompt";
import { SustainPrompt } from "./SustainPrompt";
import { SongRecoveryPrompt } from "./SongRecoveryPrompt";
import { RecordingSetupPrompt } from "./RecordingSetupPrompt";
import { SpectrumEditor } from "./SpectrumEditor";
import { ThemePrompt } from "./ThemePrompt";
import { TipPrompt } from "./TipPrompt";
import { LanguagePrompt } from "./LanguagePrompt";
import { Localization as _ } from "./Localization";
import { ChangeTempo, ChangeKeyOctave, ChangeChorus, ChangeEchoDelay, ChangeEchoSustain, ChangeReverb, ChangeVolume, ChangePan, ChangePatternSelection, ChangeSupersawDynamism, ChangeSupersawSpread, ChangeSupersawShape, ChangeWavetableSpeed, ChangeWaveInterpolation, ChangeCyclePerNote, ChangeOneShotCycle, ChangePatternsPerChannel, ChangePatternNumbers, ChangePulseWidth, ChangeFeedbackAmplitude, ChangeOperatorAmplitude, ChangeOperatorFrequency, ChangeCustomAlgorithmOrFeedback, ChangeDrumsetEnvelope, ChangePasteInstrument, ChangePreset, pickRandomPresetValue, ChangeRandomGeneratedInstrument, ChangeEQFilterType, ChangeNoteFilterType, ChangeEQFilterSimpleCut, ChangeEQFilterSimplePeak, ChangeNoteFilterSimpleCut, ChangeNoteFilterSimplePeak, ChangeScale, ChangeDetectKey, ChangeKey, ChangeRhythm, ChangeFeedbackType, ChangeAlgorithm, Change6OpFeedbackType, Change6OpAlgorithm, ChangeChipWave, ChangeNoiseWave, /*ChangeNoiseSeedRandomization, ChangeNoiseSeed,*/ ChangeTransition, ChangeToggleEffects, ChangeVibrato, ChangeUnison, ChangeUnisonVoices, ChangeUnisonSpread, ChangeUnisonOffset, ChangeUnisonExpression, ChangeUnisonSign, ChangeChord, ChangeSong, ChangePitchShift, ChangeDetune, ChangeDistortion, ChangeStringSustain, ChangeBitcrusherFreq, ChangeBitcrusherQuantization, ChangeLowerWavefold, ChangeUpperWavefold, ChangeAddEnvelope, ChangeEnvelopeSpeed, ChangeDrumEnvelopeSpeed, ChangeAddChannelInstrument, ChangeRemoveChannelInstrument, ChangeCustomWave, ChangeWavetableCustomWave, ChangeOperatorWaveform, ChangeOperatorPulseWidth, ChangeSongTitle, ChangeVibratoDepth, ChangeVibratoSpeed, ChangeVibratoDelay, ChangeVibratoType, ChangePanDelay, ChangeArpeggioSpeed, ChangeFastTwoNoteArp, ChangeArpeggioPattern, ChangeClicklessTransition, ChangeContinueThruPattern, ChangeAliasing, ChangePercussion, ChangeSDAffected, ChangeSOAffected, ChangeStrumSpeed, ChangeSlideSpeed, ChangeSongSubtitle, ChangeSetPatternInstruments, ChangeHoldingModRecording } from "./changes";
import { oscilloscopeCanvas } from "../global/Oscilloscope";
import { TrackEditor } from "./TrackEditor";
import { clamp } from "./UsefulCodingStuff";

const { button, div, input, select, span, optgroup, option, canvas } = HTML;

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    for (let index: number = 0; index < items.length; index++) {
        menu.appendChild(option({ value: index }, items[index]));
    }
    return menu;
}

// Similar to the above, but adds a non-interactive header to the list.
// @jummbus: Honestly not necessary with new HTML options interface, but not exactly necessary to change either!

function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    menu.appendChild(option({ selected: true, disabled: true, value: header }, header));

    for (const item of items) {
        menu.appendChild(option({ value: item }, item));
    }
    return menu;
}

function buildPresetOptions(isNoise: boolean, idSet: string): HTMLSelectElement {
    const menu: HTMLSelectElement = select({ id: idSet });

    if (isNoise) {
        menu.appendChild(option({ value: InstrumentType.noise }, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
        menu.appendChild(option({ value: InstrumentType.spectrum }, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
        menu.appendChild(option({ value: InstrumentType.drumset }, EditorConfig.valueToPreset(InstrumentType.drumset)!.name));
    } else {
        menu.appendChild(option({ value: InstrumentType.chip }, EditorConfig.valueToPreset(InstrumentType.chip)!.name));
        menu.appendChild(option({ value: InstrumentType.pwm }, EditorConfig.valueToPreset(InstrumentType.pwm)!.name));
        menu.appendChild(option({ value: InstrumentType.supersaw }, EditorConfig.valueToPreset(InstrumentType.supersaw)!.name));
        menu.appendChild(option({ value: InstrumentType.harmonics }, EditorConfig.valueToPreset(InstrumentType.harmonics)!.name));
        menu.appendChild(option({ value: InstrumentType.pickedString }, EditorConfig.valueToPreset(InstrumentType.pickedString)!.name));
        menu.appendChild(option({ value: InstrumentType.spectrum }, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
        menu.appendChild(option({ value: InstrumentType.fm }, EditorConfig.valueToPreset(InstrumentType.fm)!.name));
        menu.appendChild(option({ value: InstrumentType.advfm }, EditorConfig.valueToPreset(InstrumentType.advfm)!.name));
        menu.appendChild(option({ value: InstrumentType.customChipWave }, EditorConfig.valueToPreset(InstrumentType.customChipWave)!.name));
        menu.appendChild(option({ value: InstrumentType.noise }, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
        menu.appendChild(option({ value: InstrumentType.wavetable }, EditorConfig.valueToPreset(InstrumentType.wavetable)!.name))
    }

    const randomGroup: HTMLElement = optgroup({ label: (_.randomLabel) });
    randomGroup.appendChild(option({ value: "randomPreset" }, (_.randomPresetLabel)));
    randomGroup.appendChild(option({ value: "randomGenerated" }, (_.randomGeneratedLabel)));
    menu.appendChild(randomGroup);

    for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
        const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
        const group: HTMLElement = optgroup({ label: category.name + " ▾" });
        let foundAny: boolean = false;
        for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
            const preset: Preset = category.presets[presetIndex];
            if ((preset.isNoise == true) == isNoise) {
                group.appendChild(option({ value: (categoryIndex << 6) + presetIndex }, preset.name));
                foundAny = true;
            }
        }

        // Need to re-sort some elements for readability. Can't just do this in the menu, because indices are saved in URLs and would get broken if the ordering actually changed.
        if (category.name == (_.stringPresetsLabel) && foundAny) {
            // Put violin 2 after violin 1
            let moveViolin2 = group.removeChild(group.children[11]);
            group.insertBefore(moveViolin2, group.children[1]);
        }

        if (category.name == (_.flutePresetsLabel) && foundAny) {
            // Put flute 2 after flute 1
            let moveFlute2 = group.removeChild(group.children[11]);
            group.insertBefore(moveFlute2, group.children[1]);
        }

        if (category.name == (_.keyboardPresetsLabel) && foundAny) {
            // Put grand piano 2 after grand piano 1
            let moveGrandPiano2 = group.removeChild(group.children[9]);
            group.insertBefore(moveGrandPiano2, group.children[1]);
        }

        if (foundAny) menu.appendChild(group);
    }

    return menu;
}

function setSelectedValue(menu: HTMLSelectElement, value: number, isSelect2: boolean = false): void {
    const stringValue = value.toString();
    if (menu.value != stringValue) {
        menu.value = stringValue;
        // Change select2 value, if this select is a member of that class.
        if (isSelect2) {
            $(menu).val(value).trigger('change.select2');
        }
    }
}

class CustomChipCanvas {
    private mouseDown: boolean;
    private continuousEdit: boolean;
    private lastX: number;
    private lastY: number;
    public newArray: Float32Array;
    public renderedArray: Float32Array;
    public renderedColor: string;

    private _change: Change | null = null;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, private readonly _getChange: (newArray: Float32Array) => Change) {
        canvas.addEventListener("mousemove", this._onMouseMove);
        canvas.addEventListener("mousedown", this._onMouseDown);
        canvas.addEventListener("mouseup", this._onMouseUp);
        canvas.addEventListener("mouseleave", this._onMouseUp);

        this.mouseDown = false;
        this.continuousEdit = false;
        this.lastX = 0;
        this.lastY = 0;

        this.newArray = new Float32Array(64);
        this.renderedArray = new Float32Array(64);
        this.renderedColor = "";

        // Init waveform
        this.redrawCanvas();
    }

    public redrawCanvas(): void {
        const chipData: Float32Array = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customChipWave;
        const renderColor: string = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;

        this.renderedArray.set(chipData);

        // Check if the data has changed from the last render.
        let needsRedraw: boolean = false;
        if (renderColor != this.renderedColor) {
            needsRedraw = true;
        } else for (let i: number = 0; i < 64; i++) {
            if (chipData[i] != this.renderedArray[i]) {
                needsRedraw = true;
                i = 64;
            }
        }
        if (!needsRedraw) {
            return;
        }

        var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        // Black BG
        ctx.fillStyle = ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, 128, 52);
        // Mid-bar
        ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
        ctx.fillRect(0, 25, 128, 2);
        // 25-75 bars
        ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
        ctx.fillRect(0, 13, 128, 1);
        ctx.fillRect(0, 39, 128, 1);
        // Waveform
        ctx.fillStyle = renderColor;

        for (let x: number = 0; x < 64; x++) {
            var y: number = chipData[x] + 26;
            ctx.fillRect(x * 2, y - 2, 2, 4);

            this.newArray[x] = y - 26;
        }
    }

    private _onMouseMove = (event: MouseEvent): void => {
        if (this.mouseDown) {
            var x = (event.clientX || event.pageX) - this.canvas.getBoundingClientRect().left;
            var y = Math.floor((event.clientY || event.pageY) - this.canvas.getBoundingClientRect().top);

            if (y < 2) y = 2;
            if (y > 50) y = 50;

            var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

            if (this.continuousEdit == true && Math.abs(this.lastX - x) < 40) {
                var lowerBound = (x < this.lastX) ? x : this.lastX;
                var upperBound = (x < this.lastX) ? this.lastX : x;

                for (let i = lowerBound; i <= upperBound; i += 2) {
                    var progress = (Math.abs(x - this.lastX) > 2.0) ? ((x > this.lastX) ?
                        1.0 - ((i - lowerBound) / (upperBound - lowerBound))
                        : ((i - lowerBound) / (upperBound - lowerBound))) : 0.0;
                    var j = Math.round(y + (this.lastY - y) * progress);

                    ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                    ctx.fillRect(Math.floor(i / 2) * 2, 0, 2, 53);
                    ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
                    ctx.fillRect(Math.floor(i / 2) * 2, 25, 2, 2);
                    ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                    ctx.fillRect(Math.floor(i / 2) * 2, 13, 2, 1);
                    ctx.fillRect(Math.floor(i / 2) * 2, 39, 2, 1);
                    ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                    ctx.fillRect(Math.floor(i / 2) * 2, j - 2, 2, 4);

                    // Actually update current instrument's custom waveform
                    this.newArray[Math.floor(i / 2)] = (j - 26);
                }
            } else {
                ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                ctx.fillRect(Math.floor(x / 2) * 2, 0, 2, 52);
                ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
                ctx.fillRect(Math.floor(x / 2) * 2, 25, 2, 2);
                ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                ctx.fillRect(Math.floor(x / 2) * 2, 13, 2, 1);
                ctx.fillRect(Math.floor(x / 2) * 2, 39, 2, 1);
                ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                ctx.fillRect(Math.floor(x / 2) * 2, y - 2, 2, 4);

                // Actually update current instrument's custom waveform
                this.newArray[Math.floor(x / 2)] = (y - 26);
            }
            this.continuousEdit = true;
            this.lastX = x;
            this.lastY = y;

            // Preview - update integral used for sound synthesis based on new array, not actual stored array. When mouse is released, real update will happen.
            let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
            let sum: number = 0.0;
            for (let i: number = 0; i < this.newArray.length; i++) {
                sum += this.newArray[i];
            }
            const average: number = sum / this.newArray.length;
            // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
            let cumulative: number = 0;
            let wavePrev: number = 0;
            for (let i: number = 0; i < this.newArray.length; i++) {
                cumulative += wavePrev;
                wavePrev = this.newArray[i] - average;
                instrument.customChipWaveIntegral[i] = cumulative;
            }
            instrument.customChipWaveIntegral[64] = 0.0;
        }
        // Just call a change here to prevent issue with the autoFollow preference
        // messing with the canvas.
        this._getChange(this.newArray);
    }

    private _onMouseDown = (event: MouseEvent): void => {
        this.mouseDown = true;
        // Allow single-click edit
        this._onMouseMove(event);
    }
    
    private _onMouseUp = (): void => {
        this.mouseDown = false;
        this.continuousEdit = false;
        this._whenChange();
    }

    private _whenChange = (): void => {
        this._change = this._getChange(this.newArray);
        this._doc.record(this._change!);
        if (!this.mouseDown) this._change = null;
    };
}

class WavetableCustomChipCanvas {
    private mouseDown: boolean;
    private continuousEdit: boolean;
    private lastX: number;
    private lastY: number;
    public newArray: Float32Array;
    public index: number = 0;
    public renderedArray: Float32Array;
    public renderedColor: string;

    private _change: Change | null = null;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, private readonly _getChange: (newArray: Float32Array) => Change) {
        //canvas.addEventListener("input", this._whenInput);
        //canvas.addEventListener("change", this._whenChange);
        canvas.addEventListener("mousemove", this._onMouseMove);
        canvas.addEventListener("mousedown", this._onMouseDown);
        canvas.addEventListener("mouseup", this._onMouseUp);
        canvas.addEventListener("mouseleave", this._onMouseUp);

        this.mouseDown = false;
        this.continuousEdit = false;
        this.lastX = 0;
        this.lastY = 0;

        this.newArray = new Float32Array(64);
        this.renderedArray = new Float32Array(64);
        this.renderedColor = "";

        // Init waveform
        this.redrawCanvas();

    }

    public redrawCanvas(): void {
        const chipData: Float32Array = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].wavetableWaves[this.index];
        const renderColor: string = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;

        this.renderedArray.set(chipData);

        // Check if the data has changed from the last render.
        let needsRedraw: boolean = false;
        if (renderColor != this.renderedColor) {
            needsRedraw = true;
        } else for (let i: number = 0; i < 64; i++) {
            if (chipData[i] != this.renderedArray[i]) {
                needsRedraw = true;
                i = 64;
            }
        }
        if (!needsRedraw) {
            return;
        }

        var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        // Black BG
        ctx.fillStyle = ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, 128, 52);

        // Mid-bar
        ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
        ctx.fillRect(0, 25, 128, 2);

        // 25-75 bars
        ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
        ctx.fillRect(0, 13, 128, 1);
        ctx.fillRect(0, 39, 128, 1);

        // Waveform
        ctx.fillStyle = renderColor;

        for (let x: number = 0; x < 64; x++) {
            var y: number = chipData[x] + 26;
            ctx.fillRect(x * 2, y - 2, 2, 4);

            this.newArray[x] = y - 26;
        }
    }

    private _onMouseMove = (event: MouseEvent): void => {
        if (this.mouseDown) {

            var x = (event.clientX || event.pageX) - this.canvas.getBoundingClientRect().left;
            var y = Math.floor((event.clientY || event.pageY) - this.canvas.getBoundingClientRect().top);

            if (y < 2) y = 2;
            if (y > 50) y = 50;

            var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

            if (this.continuousEdit == true && Math.abs(this.lastX - x) < 40) {

                var lowerBound = (x < this.lastX) ? x : this.lastX;
                var upperBound = (x < this.lastX) ? this.lastX : x;

                for (let i = lowerBound; i <= upperBound; i += 2) {

                    var progress = (Math.abs(x - this.lastX) > 2.0) ? ((x > this.lastX) ?
                        1.0 - ((i - lowerBound) / (upperBound - lowerBound))
                        : ((i - lowerBound) / (upperBound - lowerBound))) : 0.0;
                    var j = Math.round(y + (this.lastY - y) * progress);

                    ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                    ctx.fillRect(Math.floor(i / 2) * 2, 0, 2, 53);
                    ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
                    ctx.fillRect(Math.floor(i / 2) * 2, 25, 2, 2);
                    ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                    ctx.fillRect(Math.floor(i / 2) * 2, 13, 2, 1);
                    ctx.fillRect(Math.floor(i / 2) * 2, 39, 2, 1);
                    ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                    ctx.fillRect(Math.floor(i / 2) * 2, j - 2, 2, 4);

                    // Actually update current instrument's custom waveform
                    this.newArray[Math.floor(i / 2)] = (j - 26);
                }

            }
            else {

                ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                ctx.fillRect(Math.floor(x / 2) * 2, 0, 2, 52);
                ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
                ctx.fillRect(Math.floor(x / 2) * 2, 25, 2, 2);
                ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                ctx.fillRect(Math.floor(x / 2) * 2, 13, 2, 1);
                ctx.fillRect(Math.floor(x / 2) * 2, 39, 2, 1);
                ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                ctx.fillRect(Math.floor(x / 2) * 2, y - 2, 2, 4);

                // Actually update current instrument's custom waveform
                this.newArray[Math.floor(x / 2)] = (y - 26);

            }

            this.continuousEdit = true;
            this.lastX = x;
            this.lastY = y;

            // Preview - update integral used for sound synthesis based on new array, not actual stored array. When mouse is released, real update will happen.
            let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

            let sum: number = 0.0;
            for (let i: number = 0; i < this.newArray.length; i++) {
                sum += this.newArray[i];
            }
            const average: number = sum / this.newArray.length;

            // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
            let cumulative: number = 0;
            let wavePrev: number = 0;
            for (let i: number = 0; i < this.newArray.length; i++) {
                cumulative += wavePrev;
                wavePrev = this.newArray[i] - average;
                instrument.wavetableIntegralWaves[this.index][i] = cumulative;
            }

            instrument.wavetableIntegralWaves[this.index][64] = 0.0;
        }
        // Just call a change here to prevent issue with the autoFollow preference
        // messing with the canvas.
        this._getChange(this.newArray);
    }

    private _onMouseDown = (event: MouseEvent): void => {
        this.mouseDown = true;
        // Allow single-click edit
        this._onMouseMove(event);
    }

    private _onMouseUp = (): void => {
        this.mouseDown = false;
        this.continuousEdit = false;
        this._whenChange();
    }

    private _whenChange = (): void => {
        this._change = this._getChange(this.newArray);
        this._doc.record(this._change!);
        this._change = null;
    };

}

class CustomAlgorithmCanvas {
    private mouseDown: boolean;
    //private continuousEdit: boolean;
    //private lastX: number;
    //private lastY: number;
    public newMods: number[][];
    public lookUpArray: number[][];
    public selected: number;
    public inverseModulation: number[][];
    public feedback: number[][];
    public inverseFeedback: number[][];
    public carriers: number;
    public drawArray: number[][];
    public mode: string;

    private _change: Change | null = null;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, private readonly _getChange: (newArray: number[][], carry: number, mode: string) => Change) {
        //canvas.addEventListener("input", this._whenInput);
        //canvas.addEventListener("change", this._whenChange);
        canvas.addEventListener("mousemove", this._onMouseMove);
        canvas.addEventListener("mousedown", this._onMouseDown);
        canvas.addEventListener("mouseup", this._onMouseUp);
        canvas.addEventListener("mouseleave", this._onMouseUp);

        this.mouseDown = false;
        //this.continuousEdit = false;
        //this.lastX = 0;
        //this.lastY = 0;
        this.drawArray = [[], [], [], [], [], []];
        this.lookUpArray = [[], [], [], [], [], []];
        this.carriers = 1;
        this.selected = -1;
        this.newMods = [[], [], [], [], [], []];
        this.inverseModulation = [[], [], [], [], [], []];
        this.feedback = [[], [], [], [], [], []];
        this.inverseFeedback = [[], [], [], [], [], []];
        this.mode = "algorithm";

        this.redrawCanvas();

    }

    public reset(): void {
        this.redrawCanvas(false);
        this.selected = -1;
    }

    public fillDrawArray(noReset: boolean = false): void {
        if (noReset) {
            this.drawArray = [];
            this.drawArray = [[], [], [], [], [], []];
            this.inverseModulation = [[], [], [], [], [], []];
            this.lookUpArray = [[], [], [], [], [], []];
            for (let i: number = 0; i < this.newMods.length; i++) {
                for (let o: number = 0; o < this.newMods[i].length; o++) {
                    this.inverseModulation[this.newMods[i][o] - 1].push(i + 1);
                }
            }
            if (this.mode == "feedback") {
                this.inverseFeedback = [[], [], [], [], [], []];
                for (let i: number = 0; i < this.feedback.length; i++) {
                    for (let o: number = 0; o < this.feedback[i].length; o++) {
                        this.inverseFeedback[this.feedback[i][o] - 1].push(i + 1);
                    }
                }
            }
        } else {
            this.drawArray = [];
            this.drawArray = [[], [], [], [], [], []];
            this.carriers = 1;
            this.newMods = [[], [], [], [], [], []];
            this.inverseModulation = [[], [], [], [], [], []];
            this.lookUpArray = [[], [], [], [], [], []];

            var oldMods = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customAlgorithm;
            this.carriers = oldMods.carrierCount;
            for (let i: number = 0; i < oldMods.modulatedBy.length; i++) {
                for (let o: number = 0; o < oldMods.modulatedBy[i].length; o++) {
                    this.inverseModulation[oldMods.modulatedBy[i][o] - 1].push(i + 1);
                    this.newMods[i][o] = oldMods.modulatedBy[i][o];
                }
            }
            if (this.mode == "feedback") {
                this.feedback = [[], [], [], [], [], []];
                this.inverseFeedback = [[], [], [], [], [], []];

                var oldfeed = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customFeedbackType.indices;
                for (let i: number = 0; i < oldfeed.length; i++) {
                    for (let o: number = 0; o < oldfeed[i].length; o++) {
                        this.inverseFeedback[oldfeed[i][o] - 1].push(i + 1);
                        this.feedback[i][o] = oldfeed[i][o];
                    }
                }
            }
        }
        for (let i: number = 0; i < this.inverseModulation.length; i++) {
            if (i < this.carriers) {
                this.drawArray[this.drawArray.length - 1][i] = i + 1;
                this.lookUpArray[i] = [0, i];
            } else {
                if (this.inverseModulation[i][0] != undefined) {
                    let testPos = [this.drawArray.length - (this.lookUpArray[this.inverseModulation[i][this.inverseModulation[i].length - 1] - 1][0] + 2), this.lookUpArray[this.inverseModulation[i][this.inverseModulation[i].length - 1] - 1][1]];
                    if (this.drawArray[testPos[0]][testPos[1]] != undefined) {
                        while (this.drawArray[testPos[0]][testPos[1]] != undefined && testPos[1] < 6) {
                            testPos[1]++;
                            if (this.drawArray[testPos[0]][testPos[1]] == undefined) {
                                this.drawArray[testPos[0]][testPos[1]] = i + 1;
                                this.lookUpArray[i] = [this.drawArray.length - (testPos[0] + 1), testPos[1]];
                                break;
                            }
                        }
                    } else {
                        this.drawArray[testPos[0] ][testPos[1]] = i + 1;
                        this.lookUpArray[i] = [this.drawArray.length - (testPos[0] + 1), testPos[1]];
                    }
                } else {
                    let testPos = [5, 0];
                    while (this.drawArray[testPos[0]][testPos[1]] != undefined && testPos[1] < 6) {
                        testPos[1]++;
                        if (this.drawArray[testPos[0]][testPos[1]] == undefined) {
                            this.drawArray[testPos[0]][testPos[1]] = i + 1;
                            this.lookUpArray[i] = [this.drawArray.length - (testPos[0] + 1), testPos[1]];
                            break;
                        }
                    }
                }
            }
        }
    }
    
    private drawLines(ctx:CanvasRenderingContext2D):void {
        if (this.mode == "feedback") {
            for (let off: number = 0; off < 6; off++) {
                ctx.strokeStyle = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryChannel;
                const set = off * 2  + 0.5;
                for (let i: number = 0; i < this.inverseFeedback[off].length; i++) {
                    let tar: number = this.inverseFeedback[off][i] - 1;
					let srtpos:number[] = this.lookUpArray[off];
					let tarpos:number[] = this.lookUpArray[tar];
                    ctx.beginPath();
                    ctx.moveTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12);
                    ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                    if (tarpos[1] != srtpos[1]) {
						let side:number =0;
						if(tarpos[0] >= srtpos[0]){
							side = 24;
						}
                        ctx.lineTo(srtpos[1] * 24 + side + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                        if ((tarpos[1] == (srtpos[1] - 1)) && (tarpos[0] <= (srtpos[0] - 1))) {
                        } else {
							if(tarpos[0] >= srtpos[0]){
								ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
								ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
							}else{
								ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
								ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
							}
                        }
                        ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                        ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                        ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                    } else {
                        if (srtpos[0] - tarpos[0] == 1) {
                            ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                        } else {
							if(tarpos[0] >= srtpos[0]){
								ctx.lineTo(srtpos[1] * 24 + 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
								ctx.lineTo(srtpos[1] * 24 + 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
								ctx.lineTo(tarpos[1] * 24 + set + 12, (6 - tarpos[0] - 1) * 24 + set - 12);
								ctx.lineTo(tarpos[1] * 24 + set + 12, (6 - tarpos[0] - 1) * 24);
							}else{
								ctx.lineTo(srtpos[1] * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
								ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
								ctx.lineTo(tarpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
								ctx.lineTo(tarpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
							}
                        }
                    }
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            return;
        };

        for (let off: number = 0; off < 6; off++) {
            ctx.strokeStyle = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryChannel;
            const set = off * 2 - 1 + 0.5;
            for (let i: number = 0; i < this.inverseModulation[off].length; i++) {
                let tar: number = this.inverseModulation[off][i] - 1;
				let srtpos:number[] = this.lookUpArray[off];
				let tarpos:number[] = this.lookUpArray[tar];
                ctx.beginPath();
                ctx.moveTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12);
                ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                if ((tarpos[1]) != srtpos[1]) {
                    ctx.lineTo(srtpos[1] * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                    if ((tarpos[1] == (srtpos[1] - 1)) && (tarpos[0] <= (srtpos[0] - 1))) {
                    } else {
                        ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                        ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                    }
                    ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                    ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                    ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                } else {
                    if (Math.abs(tarpos[0] - srtpos[0]) == 1) {
                        ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                    } else {
						ctx.lineTo(srtpos[1] * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
						ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
						ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
						ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                    }
                }
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    public redrawCanvas(noReset:boolean = false): void {
        this.fillDrawArray(noReset);
        var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        // Black BG
        ctx.fillStyle = ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, 144, 144);
        
        for (let x: number = 0; x < 6; x++) {
            for (let y: number = 0; y < 6; y++) {
                ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                ctx.fillRect(x * 24 + 12, ((y) * 24), 12, 12);
                ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                ctx.fillRect(x * 24 + 13, ((y) * 24)+1, 10, 10);
                if (this.drawArray[y][x] != undefined) {
                    if (this.drawArray[y][x] <= this.carriers) {
                        ctx.fillStyle = ColorConfig.getComputed("--primary-text");
                        ctx.fillRect(x * 24 + 12, ((y) * 24), 12, 12);
                        ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                        ctx.fillRect(x * 24 + 13, ((y) * 24) + 1, 10, 10);
                        ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                        ctx.fillText(this.drawArray[y][x] + "", x * 24 + 14, y * 24+10);
                    }
                    else {
                        ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                        ctx.fillRect(x * 24 + 12, (y * 24), 12, 12);
                        ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                        ctx.fillRect(x * 24 + 13, ((y) * 24) + 1, 10, 10);
                        ctx.fillStyle = ColorConfig.getComputed("--primary-text");
                        ctx.fillText(this.drawArray[y][x] + "", x * 24 + 14, y * 24+10);
                    }
                }
            }
        }
        this.drawLines(ctx);
    }

    private _onMouseMove = (event: MouseEvent): void => {
        if (this.mouseDown) {
            var x = (event.clientX || event.pageX) - this.canvas.getBoundingClientRect().left;
            var y = Math.floor((event.clientY || event.pageY) - this.canvas.getBoundingClientRect().top);
            var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
            ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
            var yindex = Math.ceil(y / 12)
            var xindex = Math.ceil(x / 12)
            yindex = (yindex/2)-Math.floor(yindex / 2) >= 0.5 ? Math.floor(yindex / 2) : -1;
            xindex = (xindex / 2)+0.5 - Math.floor(xindex / 2) <= 0.5 ? Math.floor(xindex / 2)-1 : -1;
            yindex = yindex >= 0 && yindex <= 5 ? yindex : -1;
            xindex = xindex >= 0 && xindex <= 5 ? xindex : -1;
            ctx.fillRect(xindex * 24+12, yindex * 24, 2, 2);

            if (this.selected == -1) {
                if (this.drawArray ?.[yindex] ?.[xindex] != undefined) {
                    this.selected = this.drawArray[yindex][xindex];
                    ctx.fillRect(xindex * 24 + 12, yindex * 24, 12, 12);
                    ctx.fillStyle = ColorConfig.getComputed("--editor-background");
                    ctx.fillText(this.drawArray[yindex][xindex] + "", xindex * 24 + 14, yindex * 24 + 10);
                    this.mouseDown = false;
                }
            } else {
                if (this.drawArray ?.[yindex] ?.[xindex] != undefined) {
					if(this.mode == "feedback"){
                        const newmod = this.drawArray[yindex][xindex]
						let check = this.feedback[newmod - 1].indexOf(this.selected);
						if (check != -1) {
							this.feedback[newmod - 1].splice(check, 1);
						} else {
							this.feedback[newmod - 1].push(this.selected);
						}
					} else {
						if (this.drawArray[yindex][xindex] == this.selected) {
							if (this.selected == this.carriers) {
								if (this.selected > 1) {
									this.carriers--;
								}
							} else if (this.selected - 1 == this.carriers) {
								this.carriers++
							}
						} else {
							const newmod = this.drawArray[yindex][xindex]
							if (this.selected > newmod) { //todo try to rebalence then do this in algorithm mode otherwise input as needed
								let check = this.newMods[newmod - 1].indexOf(this.selected);
								if (check != -1) {
									this.newMods[newmod - 1].splice(check, 1);
								} else {
									this.newMods[newmod - 1].push(this.selected);
								}
							} else {
								let check = this.newMods[this.selected - 1].indexOf(newmod);
								if (check != -1) {
									this.newMods[this.selected - 1].splice(check, 1);
								} else {
									this.newMods[this.selected - 1].push(newmod);
								}
							}
						}
					}
                    this.selected = -1;
                    this.redrawCanvas(true);
                    this.mouseDown = false;
                } else {
                    this.selected = -1;
                    this.redrawCanvas(true);
                    this.mouseDown = false;
                }
            }
        }
    }

    private _onMouseDown = (event: MouseEvent): void => {
        this.mouseDown = true;

        // Allow single-click edit
        this._onMouseMove(event);
    }
    private _onMouseUp = (): void => {
        this.mouseDown = false;
        //this.continuousEdit = false;

        this._whenChange();
    }

    private _whenChange = (): void => {
        this._change = this._getChange(this.mode == "algorithm" ? this.newMods : this.feedback, this.carriers, this.mode);

        this._doc.record(this._change!);

        this._change = null;
    };
}

export class SongEditor {
    public prompt: Prompt | null = null;

    private readonly _keyboardLayout: KeyboardLayout = new KeyboardLayout(this._doc);
    private readonly _patternEditorPrev: PatternEditor = new PatternEditor(this._doc, false, -1);
    private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc, true, 0);
    private readonly _patternEditorNext: PatternEditor = new PatternEditor(this._doc, false, 1);
    private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc, this);
    private readonly _muteEditor: MuteEditor = new MuteEditor(this._doc, this);
    private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc, this._trackEditor);
    private readonly _piano: Piano = new Piano(this._doc);
    private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc, this._piano);
    private readonly _playButton: HTMLButtonElement = button({ class: "playButton", type: "button", title: _.playSpaceLabel, style: "font-size: 13px;" }, span(_.playLabel));
    private readonly _pauseButton: HTMLButtonElement = button({ class: "pauseButton", style: "display: none; font-size: 13px;", type: "button", title: _.pauseSpaceLabel }, span(_.pauseLabel));
    private readonly _recordButton: HTMLButtonElement = button({ class: "recordButton", style: "display: none; font-size: 13px;", type: "button", title: _.recordCTRLSpaceLabel }, span(_.recordLabel));
    private readonly _stopButton: HTMLButtonElement = button({ class: "stopButton", style: "display: none; font-size: 13px;", type: "button", title: _.stopRecordSpaceLabel }, span(_.stopLabel));
    private readonly _prevBarButton: HTMLButtonElement = button({ class: "prevBarButton", type: "button", title: _.prevBarLBrackLabel });
    private readonly _nextBarButton: HTMLButtonElement = button({ class: "nextBarButton", type: "button", title: _.nextBarRBrackLabel });
    private readonly _volumeSlider: Slider = new Slider(input({ title: _.mainVolumeLabel, style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "75", value: "50", step: "1" }), this._doc, null, false);
    private readonly _outVolumeBarBg: SVGRectElement = SVG.rect({ "pointer-events": "none", width: "90%", height: "50%", x: "5%", y: "25%", fill: ColorConfig.uiWidgetBackground });
    private readonly _outVolumeBar: SVGRectElement = SVG.rect({ "pointer-events": "none", height: "50%", width: "0%", x: "5%", y: "25%", fill: "url('#volumeGrad2')" });
    private readonly _outVolumeCap: SVGRectElement = SVG.rect({ "pointer-events": "none", width: "2px", height: "50%", x: "5%", y: "25%", fill: ColorConfig.uiWidgetFocus });
    private readonly _stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "60%" });
    private readonly _stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "90%" });
    private readonly _stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "100%" });
    private readonly _gradient: SVGGradientElement = SVG.linearGradient({ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" }, this._stop1, this._stop2, this._stop3);
    private readonly _defs: SVGDefsElement = SVG.defs({}, this._gradient);
    private readonly _volumeBarContainer: SVGSVGElement = SVG.svg({ style: `touch-action: none; overflow: visible; margin: auto; max-width: 20vw;`, width: "160px", height: "100%", preserveAspectRatio: "none", viewBox: "0 0 160 12" },
        this._defs,
        this._outVolumeBarBg,
        this._outVolumeBar,
        this._outVolumeCap,
    );
    private readonly _volumeBarBox: HTMLDivElement = div({ class: "playback-volume-bar", style: "height: 12px; align-self: center;" },
        this._volumeBarContainer,
    );
    private readonly _fileMenu: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ selected: true, disabled: true, hidden: false }, span(_.fileSettingsLabel)), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "new" }, (_.newBlankSongLabel)),
        option({ value: "import" }, (_.importSongLabel) + EditorConfig.ctrlSymbol + "O)"),
        option({ value: "export" }, (_.exportSongLabel) + EditorConfig.ctrlSymbol + "S)"),
        option({ value: "copyUrl" }, (_.copyURLLabel)),
        option({ value: "shareUrl" }, (_.shareURLLabel)),
        option({ value: "shortenUrl" }, (_.shortenURLLabel)),
        option({ value: "viewPlayer" }, (_.songPlayerLabel)),
        option({ value: "copyEmbed" }, (_.copyEmbedCodeLabel)),
        option({ value: "songRecovery" }, (_.recoverSongLabel)),
    );
    private readonly _editMenu: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ selected: true, disabled: true, hidden: false }, span(_.editSettingsLabel)), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "undo" }, (_.undoLabel)),
        option({ value: "redo" }, (_.redoLabel)),
        option({ value: "copy" }, (_.copyPatternLabel)),
        option({ value: "pasteNotes" }, (_.pastePatternNotesLabel)),
        option({ value: "pasteNumbers" }, (_.pastePatternNumbersLabel) + EditorConfig.ctrlSymbol + "⇧V)"),
        option({ value: "cut"}, (_.cutLabel)),
        option({ value: "insertBars" }, (_.insertBarLabel)),
        option({ value: "deleteBars" }, (_.deleteBarLabel)),
        option({ value: "insertChannel" }, (_.insertChannelLabel) + EditorConfig.ctrlSymbol + "⏎)"),
        option({ value: "deleteChannel" }, (_.deleteChannelLabel) + EditorConfig.ctrlSymbol + "⌫)"),
        option({ value: "selectChannel" }, (_.selectChannelLabel)),
        option({ value: "selectAll" }, (_.selectAllLabel)),
        option({ value: "duplicatePatterns" }, (_.duplicatePatternsLabel)),
        option({ value: "transposeUp" }, (_.moveNotesUpLabel)),
        option({ value: "transposeDown" }, (_.moveNotesDownLabel)),
        option({ value: "moveNotesSideways" }, (_.moveNotesSidesLabel)),
        option({ value: "beatsPerBar" }, (_.beatsInBarLabel)),
        option({ value: "barCount" }, (_.songLengthLabel)),
        option({ value: "channelSettings" }, (_.channelSettingsLabel)),
        option({ value: "limiterSettings" }, (_.limiterSettingsLabel)),
        option({ value: "randomGenSettings"}, (_.randomGenSettingsLabel) + EditorConfig.ctrlSymbol + "R)"),
    );
    private readonly _optionsMenu: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ selected: true, disabled: true, hidden: false }, span(_.preferenceSettingsLabel)), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "autoPlay" }, (_.autoPlayLabel)),
        option({ value: "autoFollow" }, (_.autoFollowLabel)),
        option({ value: "enableNotePreview" }, (_.enableNotePreviewLabel)),
        option({ value: "showLetters" }, (_.showPianoLabel)),
        option({ value: "showFifth" }, (_.showFifthLabel)),
        option({ value: "notesOutsideScale" }, (_.notesOutsideScaleLabel)),
        option({ value: "setDefaultScale" }, (_.setDefaultScaleLabel)),
        option({ value: "showChannels" }, (_.showAllChannelsLabel)),
        option({ value: "showScrollBar" }, (_.scrollbarLabel)),
        option({ value: "alwaysFineNoteVol" }, (_.fineNoteVolumeLabel)),
        option({ value: "enableChannelMuting" }, (_.channelMutingLabel)),
        option({ value: "displayBrowserUrl" }, (_.displayURLInBrowserLabel)),
        option({ value: "displayVolumeBar" }, (_.showPlaybackBarLabel)),
        option({ value: "showOscilloscope" }, (_.showOscilloscopeLabel)),
        option({ value: "language" }, (_.setLanguageLabel)),
        option({ value: "layout" }, (_.setLayoutLabel)),
        option({ value: "colorTheme" }, (_.setThemeLabel)),
        option({ value: "recordingSetup" }, (_.setNoteRecordingLabel)),
        option({ value: "keybindSetup" }, (_.keybindSetupLabel)),
    );

    private readonly _scaleSelect: HTMLSelectElement = buildOptions(select(), [
        _.scale1Label, 
        _.scale2Label, 
        _.scale3Label, 
        _.scale4Label, 
        _.scale5Label, 
        _.scale6Label, 
        _.scale7Label, 
        _.scale8Label, 
        _.scale9Label, 
        _.scale10Label, 
        _.scale11Label, 
        _.scale12Label, 
        _.scale13Label, 
        _.scale14Label, 
        _.scale15Label, 
        _.scale16Label, 
        _.scale17Label, 
        _.scale18Label, 
        _.scale19Label, 
        _.scale20Label,
        _.scale21Label

    ]);
    private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map(key => key.name).reverse());
    // Issue#31 - Add a song detune slider here replicating that of the modulator's.
    private readonly _octaveStepper: HTMLInputElement = input({ style: "width: 59.5%;", type: "number", min: Config.octaveMin, max: Config.octaveMax, value: "0" });
    private readonly _tempoSlider: Slider = new Slider(input({ style: "margin: 0; vertical-align: middle;", type: "range", min: "30", max: "320", value: "160", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, newValue), false);
    private readonly _tempoStepper: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1" });
    private readonly _chorusSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.chorusRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeChorus(this._doc, oldValue, newValue), false);
    private readonly _chorusRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chorus") }, span(_.chorusLabel)), this._chorusSlider.container);
    private readonly _reverbSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky,", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue), false);
    private readonly _reverbRow: HTMLDivElement = div({ class: "selectRow" }, span({ style: "font-size: x-small;", class: "tip", onclick: () => this._openPrompt("reverb") }, span(_.reverbLabel)), this._reverbSlider.container);
    private readonly _echoSustainSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoSustainRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEchoSustain(this._doc, oldValue, newValue), false);
    private readonly _echoSustainRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("echoSustain") }, span(_.echoLabel)), this._echoSustainSlider.container);
    private readonly _echoDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoDelayRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEchoDelay(this._doc, oldValue, newValue), false);
    // Issue#59 - Add input boxes to various speed/delay sliders for more accurate inputs.
    private readonly _echoDelayBeatMarkers: HTMLDivElement[] = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.uiWidgetBackground, left: "23%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.uiWidgetBackground, left: "49%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.uiWidgetBackground, left: "74%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.uiWidgetBackground, left: "100%" } })];
    private readonly _echoDelayBeatMarkerContainer: HTMLDivElement = div({ style: "display: flex; position: relative;" }, this._echoDelaySlider.container, div({ class: "pitchShiftMarkerContainer" }, this._echoDelayBeatMarkers));
    private readonly _echoDelayRow: HTMLDivElement = div({ class: "selectRow" }, span({ /*style: "font-size: x-small;",*/ class: "tip", onclick: () => this._openPrompt("echoDelay") }, span(_.echoDelayLabel)), this._echoDelayBeatMarkerContainer);
    private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select(), [
        _.rhythmBy3Label,
        _.rhythmBy4Label,
        _.rhythmBy6Label,
        _.rhythmBy8Label,
        _.rhythmBy24Label

    ]);
    private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false, "pitchPresetSelect");
    private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true, "drumPresetSelect");
    private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms.map(algorithm => algorithm.name));
    private readonly _algorithmSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, span(_.algorithmLabel)), div({ class: "selectContainer" }, this._algorithmSelect));
    private readonly _instrumentButtons: HTMLButtonElement[] = [];
    private readonly _instrumentAddButton: HTMLButtonElement = button({ type: "button", class: "add-instrument last-button" });
    private readonly _instrumentRemoveButton: HTMLButtonElement = button({ type: "button", class: "remove-instrument" });
    private readonly _instrumentsButtonBar: HTMLDivElement = div({ class: "instrument-bar" }, this._instrumentRemoveButton, this._instrumentAddButton);
    private readonly _instrumentsButtonRow: HTMLDivElement = div({ class: "selectRow", style: "display: none;" }, span({ class: "tip", onclick: () => this._openPrompt("instrumentIndex") }, span(_.instAmountLabel)), this._instrumentsButtonBar);
    private readonly _instrumentVolumeSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: Math.floor(-Config.volumeRange / 2), max: Math.floor(Config.volumeRange / 2), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, newValue), true);
    private readonly _instrumentVolumeSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%", id: "volumeSliderInputBox", type: "number", step: "1", min: Math.floor(-Config.volumeRange / 2), max: Math.floor(Config.volumeRange / 2), value: "0" });
    private readonly _instrumentVolumeSliderTip: HTMLDivElement = div({ class: "selectRow", style: "height: 1em" }, span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("instrumentVolume") }, _.volumeLabel));
    private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        div({ style: `color: ${ColorConfig.secondaryText};` }, span({ class: "tip" }, this._instrumentVolumeSliderTip)),
        div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` }, this._instrumentVolumeSliderInputBox),
    ), this._instrumentVolumeSlider.container);
    private readonly _panSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: "0", max: Config.panMax, value: Config.panCenter, step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePan(this._doc, oldValue, newValue), true);
    private readonly _panDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Pan) }, "▼");
    private readonly _panSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "panSliderInputBox", type: "number", step: "1", min: "0", max: "100", value: "0" });
    private readonly _panSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", tabindex: "0", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("pan") }, span(_.panLabel)),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._panSliderInputBox),
    ), this._panDropdown, this._panSlider.container);
    private readonly _panDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["pan delay"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePanDelay(this._doc, oldValue, newValue), false);
    private readonly _panDelayRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("panDelay") }, span(_.panDelayLabel)), this._panDelaySlider.container);
    private readonly _panDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._panDelayRow);
    private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select(), [
        _.wave1Label,
        _.wave2Label,
        _.wave3Label,
        _.wave4Label,
        _.wave5Label,
        _.wave6Label,
        _.wave7Label,
        _.wave8Label,
        _.wave9Label,
        _.wave10Label,
        _.wave11Label,
        _.wave12Label,
        _.wave13Label,
        _.wave14Label,
        _.wave15Label,
        _.wave16Label,
        _.wave17Label,
        _.wave18Label,
        _.wave19Label,
        _.wave20Label,
        _.wave21Label,
        _.wave22Label,
        _.wave23Label,
        _.wave24Label,
        _.wave25Label,
        _.wave26Label,
        _.wave27Label,
        _.wave28Label,
        _.wave29Label,
        _.wave30Label,
        _.wave31Label,
        _.wave32Label,
        _.wave33Label
    ]);
    private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(select(), [
        _.noise1Label,
        _.noise2Label,
        _.noise3Label,
        _.noise4Label,
        _.noise5Label,
        _.noise6Label,
        _.noise7Label,
        _.noise8Label,
        _.noise9Label,
        _.noise10Label,
        _.noise11Label,
        _.noise12Label,
        _.noise13Label,
        _.noise14Label,
        _.noise15Label,
        _.noise16Label
    ]);
    private readonly _chipWaveSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipWave") }, span(_.waveLabel)), div({ class: "selectContainer" }, this._chipWaveSelect));
    private readonly _chipNoiseSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipNoise") }, span(_.noiseLabel)), div({ class: "selectContainer" }, this._chipNoiseSelect));
    //private readonly _isNoiseSeedRandomizedBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    //private readonly _isNoiseSeedRandomizedRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("randomOrSeed") }, span(_.useSeedLabel)), this._isNoiseSeedRandomizedBox);
    //private readonly _noiseSeedInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "noiseSeedInputBox", type: "number", step: "1", min: "0", max: Config.maxAmountOfRandomSeeds, value: "0" });
    //private readonly _noiseSeedRow: HTMLDivElement = div({ class: "selectRow" }, div({},
    //    span({ class: "tip", style: "height:1em; font-size: 14px;", onclick: () => this._openPrompt("seed") }, _.seedLabel),
    //    div({ style: "margin-top: -1px;"}, this._noiseSeedInputBox),
    //));
    private readonly _fadeInOutEditor: FadeInOutEditor = new FadeInOutEditor(this._doc);
    // Issue#36 - Add input boxes for the fade in/out editor that target post-fade-in, pre-fade-out, and post-fade-out.
    private readonly _fadeInOutRow: HTMLElement = div({ class: "selectRow" }, span({ style: "font-size: smaller;", class: "tip", onclick: () => this._openPrompt("fadeInOut") }, span(_.fadeLabel)), this._fadeInOutEditor.container);
    private readonly _transitionSelect: HTMLSelectElement = buildOptions(select(), [
        _.transition1Label,
        _.transition2Label,
        _.transition3Label,
        _.transition4Label
    ]);
    private readonly _transitionDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Transition) }, "▼");
    private readonly _transitionRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("transition") }, span(_.transitionLabel)), this._transitionDropdown, div({ class: "selectContainer", style: "width: 52.5%;" }, this._transitionSelect));
    private readonly _slideSpeedDisplay: HTMLSpanElement = span({ style: `color: ${ColorConfig.secondaryText}; font-size: 11px; text-overflow: clip;`, class: "tip", onclick: () => this._openPrompt("tk") }, "1 tk");
    private readonly _slideSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["slide speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeSlideSpeed(this._doc, oldValue, newValue), false);
    // Issue#59 - Add input boxes to various speed/delay sliders for more accurate inputs.
    private readonly _slideSpeedRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ style: "font-size: smaller; margin-left:4px;", class: "tip", onclick: () => this._openPrompt("slideSpeed") }, span(_.slideSpeedLabel)), this._slideSpeedDisplay, this._slideSpeedSlider.container);
    private readonly _clicklessTransitionBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _clicklessTransitionRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("clicklessTransition") }, span(_.clicklessLabel)), this._clicklessTransitionBox);
    private readonly _continueThruPatternBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _continueThruPatternRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("continueThruPattern") }, span(_.continueThroughPatternLabel)), this._continueThruPatternBox);
    private readonly _transitionDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" },this._slideSpeedRow, this._clicklessTransitionRow, this._continueThruPatternRow);

    private readonly _effectsSelect: HTMLSelectElement = select(option({ selected: true, disabled: true, hidden: false })); // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
    private readonly _eqFilterSimpleButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "no-underline", onclick: () => this._switchEQFilterType(true) }, span(_.simpleLabel));
    private readonly _eqFilterAdvancedButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button no-underline", onclick: () => this._switchEQFilterType(false) }, span(_.advancedLabel));
    private readonly _eqFilterTypeRow: HTMLElement = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" }, span({ style: "font-size: x-small;", class: "tip", onclick: () => this._openPrompt("filterType") }, span(_.EQTypeLabel)), div({ class: "instrument-bar" }, this._eqFilterSimpleButton, this._eqFilterAdvancedButton));
    private readonly _eqFilterEditor: FilterEditor = new FilterEditor(this._doc);
    private readonly _eqFilterZoom: HTMLButtonElement = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: () => this._openPrompt("customEQFilterSettings") }, "+");
    private readonly _eqFilterRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("eqFilter") }, span(_.EQLabel)), this._eqFilterZoom, this._eqFilterEditor.container);
    private readonly _eqFilterSimpleCutSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimpleCutRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEQFilterSimpleCut(this._doc, oldValue, newValue), false);
    private _eqFilterSimpleCutRow: HTMLDivElement = div({ class: "selectRow", style: "font-size: 12px;", title: _.simpleFilter1Label }, span({ class: "tip", onclick: () => this._openPrompt("filterCutoff") }, span(_.filterCutLabel)), this._eqFilterSimpleCutSlider.container);
    private readonly _eqFilterSimplePeakSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimplePeakRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEQFilterSimplePeak(this._doc, oldValue, newValue), false);
    private _eqFilterSimplePeakRow: HTMLDivElement = div({ class: "selectRow", style: "font-size: 12px;", title: _.simpleFilter2Label }, span({ class: "tip", onclick: () => this._openPrompt("filterResonance") }, span(_.filterPeakLabel)), this._eqFilterSimplePeakSlider.container);

    private readonly _noteFilterSimpleButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "no-underline", onclick: () => this._switchNoteFilterType(true) }, span(_.simpleLabel));
    private readonly _noteFilterAdvancedButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button no-underline", onclick: () => this._switchNoteFilterType(false) }, span(_.advancedLabel));
    private readonly _noteFilterTypeRow: HTMLElement = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" }, span({ style: "font-size: x-small;", class: "tip", onclick: () => this._openPrompt("filterType") }, span(_.noteFiltTypeLabel)), div({ class: "instrument-bar" }, this._noteFilterSimpleButton, this._noteFilterAdvancedButton));
    private readonly _noteFilterEditor: FilterEditor = new FilterEditor(this._doc, true);
    private readonly _noteFilterZoom: HTMLButtonElement = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: () => this._openPrompt("customNoteFilterSettings") }, "+");
    private readonly _noteFilterRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("noteFilter") }, span(_.noteFiltLabel)), this._noteFilterZoom, this._noteFilterEditor.container);
    private readonly _noteFilterSimpleCutSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimpleCutRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeNoteFilterSimpleCut(this._doc, oldValue, newValue), false);
    private _noteFilterSimpleCutRow: HTMLDivElement = div({ class: "selectRow", style: "font-size: 12px;", title: _.simpleFilter1Label }, span({ class: "tip", onclick: () => this._openPrompt("filterCutoff") }, span(_.filterCutLabel)), this._noteFilterSimpleCutSlider.container);
    private readonly _noteFilterSimplePeakSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimplePeakRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeNoteFilterSimplePeak(this._doc, oldValue, newValue), false);
    private _noteFilterSimplePeakRow: HTMLDivElement = div({ class: "selectRow", style: "font-size: 12px;", title: _.simpleFilter2Label }, span({ class: "tip", onclick: () => this._openPrompt("filterResonance") }, span(_.filterPeakLabel)), this._noteFilterSimplePeakSlider.container);

    private readonly _supersawDynamismSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.supersawDynamismMax, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeSupersawDynamism(this._doc, oldValue, newValue), false);
	private readonly _supersawDynamismRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("supersawDynamism")}, span(_.dynamismLabel)), this._supersawDynamismSlider.container);
	private readonly _supersawSpreadSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.supersawSpreadMax, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeSupersawSpread(this._doc, oldValue, newValue), false);
	private readonly _supersawSpreadRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("supersawSpread")}, span(_.spreadLabel)), this._supersawSpreadSlider.container);
	private readonly _supersawShapeSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.supersawShapeMax, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeSupersawShape(this._doc, oldValue, newValue), false);
	private readonly _supersawShapeRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", style: "overflow: clip; font-size: 95%;", onclick: ()=>this._openPrompt("supersawShape")}, span(_.sawToPulseLabel)), this._supersawShapeSlider.container);

    private readonly _wavetableSpeedDisplay: HTMLSpanElement = span({ style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`, class: "tip", onclick: () => this._openPrompt("wpb") }, "1wpb");
    private readonly _wavetableSpeedSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.wavetableSpeedMax, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeWavetableSpeed(this._doc, oldValue, newValue), false);
    // Issue#59 - Add input boxes to various speed/delay sliders for more accurate inputs.
    private readonly _wavetableSpeedRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("wavetableSpeed")}, span(_.wavetableSpeedLabel)), this._wavetableSpeedDisplay, this._wavetableSpeedSlider.container);
    private readonly _interpolateWavesBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _interpolateWavesRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("interpolateWaves") }, span(_.interpolateWavesLabel)), this._interpolateWavesBox);
    private readonly _resetCyclePerNoteBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _resetCyclePerNoteRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "font-size: 11px; margin-left:10px;", onclick: () => this._openPrompt("resetCyclePerNote") }, span(_.resetCyclePerNoteLabel)), this._resetCyclePerNoteBox);
    private readonly _oneShotCycleBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _oneShotCycleRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("oneShotCycle") }, span(_.oneShotCycleLabel)), this._oneShotCycleBox);
    private readonly _wavetableWaveButtons: HTMLButtonElement[] = [
        button({class: "wavetableButtonType2", style: "text-align: center;", }, span("1")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("2")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("3")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("4")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("5")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("6")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("7")),
        button({class: "wavetableButtonType3", style: "text-align: center;", }, span("8")),
        button({class: "wavetableButtonType1", style: "text-align: center;", }, span("9")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("10")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("11")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("12")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("13")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("14")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("15")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("16")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("17")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("18")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("19")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("20")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("21")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("22")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("23")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("24")),
        button({class: "wavetableButtonType4", style: "text-align: left; text-indent: -0.25em;", }, span("25")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("26")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("27")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("28")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("29")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("30")),
        button({class: "wavetableButtonType1", style: "text-align: left; text-indent: -0.25em;", }, span("31")),
        button({class: "wavetableButtonType5", style: "text-align: left; text-indent: -0.25em;", }, span("32")),
    ];
    private readonly _wavetableWaveButtonsContainer: HTMLDivElement = div({ style: "display: grid; grid-template-columns: repeat(8, minmax(auto, 18px)); grid-gap: 2px 2px; grid-auto-rows: 18px; margin-left: 15px; margin-top:10px; margin-bottom:2px; width: 136px;"}, this._wavetableWaveButtons);

    private readonly _pulseWidthSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "1", max: Config.pulseWidthRange, value: "1", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePulseWidth(this._doc, oldValue, newValue), false);
    private readonly _pwmSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 70%; ", id: "pwmSliderInputBox", type: "number", step: "1", min: "1", max: Config.pulseWidthRange, value: "1" });
    private readonly _pulseWidthRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", tabindex: "0", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("pulseWidth") }, _.pwmLabel),
        div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` }, this._pwmSliderInputBox)
        ), this._pulseWidthSlider.container);
    private readonly _pitchShiftSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.pitchShiftRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePitchShift(this._doc, oldValue, newValue), true);
    private readonly _pitchShiftTonicMarkers: HTMLDivElement[] = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "50%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "100%" } })];
    private readonly _pitchShiftFifthMarkers: HTMLDivElement[] = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 7 / 24) + "%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 19 / 24) + "%" } })];
    private readonly _pitchShiftMarkerContainer: HTMLDivElement = div({ style: "display: flex; position: relative;" }, this._pitchShiftSlider.container, div({ class: "pitchShiftMarkerContainer" }, this._pitchShiftTonicMarkers, this._pitchShiftFifthMarkers));
    private readonly _pitchShiftRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pitchShift") }, span(_.pitchShiftLabel)), this._pitchShiftMarkerContainer);
    private readonly _detuneSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: Config.detuneMin - Config.detuneCenter, max: Config.detuneMax - Config.detuneCenter, value: 0, step: "2" }), this._doc, (oldValue: number, newValue: number) => new ChangeDetune(this._doc, oldValue, newValue), true);
    private readonly _detuneSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "detuneSliderInputBox", type: "number", step: "1", min: Config.detuneMin - Config.detuneCenter, max: Config.detuneMax - Config.detuneCenter, value: 0 });
    private readonly _detuneSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", style: "height:1em; font-size: x-small;", onclick: () => this._openPrompt("detune") }, span(_.detuneLabel)),
        div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, this._detuneSliderInputBox),
    ), this._detuneSlider.container);
    private readonly _distortionSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: "0", max: Config.distortionRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeDistortion(this._doc, oldValue, newValue), false);
    private readonly _distortionRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("distortion") }, span(_.distortionLabel)), this._distortionSlider.container);
    private readonly _aliasingBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _aliasingRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("aliases") }, span(_.aliasingLabel)), this._aliasingBox);
    private readonly _percussionBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _percussionRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("percussion") }, span(_.percussionLabel)), this._percussionBox);
    private readonly _songDetuneEffectedBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _songDetuneEffectedRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("songDetuneEffected") }, span(_.songDetuneEffectedLabel)), this._songDetuneEffectedBox);
    private readonly _songOctaveEffectedBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _songOctaveEffectedRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("songOctaveEffected") }, span(_.songOctaveEffectedLabel)), this._songOctaveEffectedBox);
    private readonly _bitcrusherQuantizationSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherQuantizationRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeBitcrusherQuantization(this._doc, oldValue, newValue), false);
    private readonly _bitcrusherQuantizationRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", title: (_.bitCrushHover), onclick: () => this._openPrompt("bitcrusherQuantization") }, span(_.bitCrushLabel)), this._bitcrusherQuantizationSlider.container);
    private readonly _bitcrusherFreqSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherFreqRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeBitcrusherFreq(this._doc, oldValue, newValue), false);
    private readonly _bitcrusherFreqRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", title: (_.freqCrushHover), onclick: () => this._openPrompt("bitcrusherFreq") }, span(_.freqCrushLabel)), this._bitcrusherFreqSlider.container);
    private readonly _wavefoldLowerInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 75%; margin-left: 0.4em; vertical-align: middle;", id: "wavefoldLowerInputBox", type: "number", step: "0.5", min: Config.wavefoldLowerMin, max: Config.wavefoldLowerMax, value: Config.wavefoldLowerMax });
    private readonly _wavefoldLowerRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller; margin-top: 2px;", onclick: () => this._openPrompt("wavefoldLower") }, _.wavefoldLowerLabel),
        div({ style: "margin-top: -1px;"}, this._wavefoldLowerInputBox),
    ));
    private readonly _wavefoldUpperInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 75%; margin-left: 0.4em; vertical-align: middle;", id: "wavefoldUpperInputBox", type: "number", step: "0.5", min: Config.wavefoldUpperMin, max: Config.wavefoldUpperMax, value: Config.wavefoldUpperMax });
    private readonly _wavefoldUpperRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller; margin-top: 2px;", onclick: () => this._openPrompt("wavefoldUpper") }, _.wavefoldUpperLabel),
        div({ style: "margin-top: -1px;"}, this._wavefoldUpperInputBox),
    ));
    private readonly _stringSustainSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.stringSustainRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeStringSustain(this._doc, oldValue, newValue), false);
    private readonly _stringSustainLabel: HTMLSpanElement = span({class: "tip", onclick: ()=>this._openPrompt("stringSustain")}, span(_.sustainLabel));
    private readonly _stringSustainRow: HTMLDivElement = div({class: "selectRow"}, this._stringSustainLabel, this._stringSustainSlider.container);
    private readonly _unisonDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Unison) }, "▼");
    private readonly _unisonSelect: HTMLSelectElement = buildOptions(select(), [
        _.unison1Label,
        _.unison2Label,
        _.unison3Label,
        _.unison4Label,
        _.unison5Label,
        _.unison6Label,
        _.unison7Label,
        _.unison8Label,
        _.unison9Label,
        _.unison10Label,
        _.unison11Label,
        _.unison12Label,
        _.unison13Label,
        _.unison14Label,
        _.unison15Label,
        _.unison16Label,
        _.unison17Label,
        _.unison18Label,
        _.unison19Label,
        _.unison20Label,
        _.unison21Label,
        _.unison22Label,
        _.unison23Label,
        _.unison24Label,
        _.unison25Label
    ]);
    private readonly _unisonSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("unison") }, span(_.unisonLabel)), this._unisonDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._unisonSelect));
    private readonly _unisonVoicesInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonVoicesInputBox", type: "number", step: "1", min: Config.unisonVoicesMin, max: Config.unisonVoicesMax, value: 1 });
    private readonly _unisonVoicesRow: HTMLDivElement = div({ class: "selectRow dropFader" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("unisonVoices") }, _.unisonVoicesLabel),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonVoicesInputBox),
    ));
    private readonly _unisonSpreadInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonSpreadInputBox", type: "number", step: "0.001", min: Config.unisonSpreadMin, max: Config.unisonSpreadMax, value: 0.0 });
    private readonly _unisonSpreadRow: HTMLDivElement = div({ class: "selectRow dropFader" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("unisonSpread") }, _.unisonSpreadLabel),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonSpreadInputBox),
    ));
    private readonly _unisonOffsetInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonOffsetInputBox", type: "number", step: "0.001", min: Config.unisonOffsetMin, max: Config.unisonOffsetMax, value: 0.0 });
    private readonly _unisonOffsetRow: HTMLDivElement = div({ class: "selectRow dropFader" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("unisonOffset") }, _.unisonOffsetLabel),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonOffsetInputBox),
    ));
    private readonly _unisonExpressionInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonExpressionInputBox", type: "number", step: "0.001", min: Config.unisonExpressionMin, max: Config.unisonExpressionMax, value: 1.4 });
    private readonly _unisonExpressionRow: HTMLDivElement = div({ class: "selectRow dropFader" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("unisonVolume") }, _.unisonVolumeLabel),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonExpressionInputBox),
    ));
    private readonly _unisonSignInputBox: HTMLInputElement = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonSignInputBox", type: "number", step: "0.001", min: Config.unisonSignMin, max: Config.unisonSignMax, value: 1.0 });
    private readonly _unisonSignRow: HTMLDivElement = div({ class: "selectRow dropFader" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("unisonSign") }, _.unisonSignLabel),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonSignInputBox),
    ));
    private readonly _unisonDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._unisonVoicesRow, this._unisonSpreadRow, this._unisonOffsetRow, this._unisonExpressionRow, this._unisonSignRow);

    private readonly _chordSelect: HTMLSelectElement = buildOptions(select(), [
        _.chord1Label,
        _.chord2Label,
        _.chord3Label,
        _.chord4Label,
    ]);
    private readonly _chordDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Chord) }, "▼");
    private readonly _chordDropdown2: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Strum) }, "▼");

    private readonly _chordSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chords") }, span(_.chordLabel)), this._chordDropdown, this._chordDropdown2, div({ class: "selectContainer" }, this._chordSelect));
    private readonly _strumSpeedDisplay: HTMLSpanElement = span({ style: `color: ${ColorConfig.secondaryText}; font-size: 11px; text-overflow: clip;`, class: "tip", onclick: () => this._openPrompt("tk") }, "1 tk");
    private readonly _strumSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["strum speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeStrumSpeed(this._doc, oldValue, newValue), false);
    // Issue#59 - Add input boxes to various speed/delay sliders for more accurate inputs.
    private readonly _strumSpeedRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ style: "font-size: smaller; margin-left:4px;", class: "tip", onclick: () => this._openPrompt("strumSpeed") }, span(_.strumSpeedLabel)), this._strumSpeedDisplay, this._strumSpeedSlider.container);
    private readonly _arpeggioSpeedDisplay: HTMLSpanElement = span({ style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`, class: "tip", onclick: () => this._openPrompt("x") }, "x1");
    private readonly _arpeggioSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["arp speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeArpeggioSpeed(this._doc, oldValue, newValue), false);
    // Issue#59 - Add input boxes to various speed/delay sliders for more accurate inputs.
    private readonly _arpeggioSpeedRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ style: "font-size: smaller; margin-left:4px;", class: "tip", onclick: () => this._openPrompt("arpeggioSpeed") }, span(_.arpSpeedLabel)), this._arpeggioSpeedDisplay, this._arpeggioSpeedSlider.container);
    private readonly _twoNoteArpBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _twoNoteArpRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px; font-size: 11px;", onclick: () => this._openPrompt("twoNoteArpeggio") }, span(_.twoFastArpLabel)), this._twoNoteArpBox);
    private readonly _arpeggioPatternSelectedText: HTMLSpanElement = span({ style: `color: ${ColorConfig.getChannelColor(this._doc.song, this._doc.channel)}; margin-bottom: 0px;`}, _.arpeggioPattern1Label);
    private readonly _arpeggioPatternSelect: HTMLSelectElement = buildOptions(select(), [
        "1 2 3 4 5 6 7 8 9",                              // Normal
        "1 2 3) 4 5 6 7 8 9",                             // Legacy. For older songs.
        "1 2 1 3 4 5 4 6 7 8 7 9",                        // Scramble
        "1 2 1 3 1 4 1 5 1 6 1 7 1 8 1 9",                // Oscillate
        "1 2 1 3 2 4 3 5 4 6 5 7 6 8 7 9",                // Escalate
        "1 9 2 8 3 7 4 6 5",                              // Shift
        "1) 2) 3) 4) 5) 6) 7) 8) 9)",                    // Normal Bounce
        "1 2 1 3 4 5 4 6 7 8 7 9 4 5 4 6",               // Scramble Bounce
        "1 2) 1 3) 1 4) 1 5) 1 6) 1 7) 1 8) 1 9)",       // Oscillate Bounce
        "1) 2) 1 3) 2 4) 3 5) 4 6) 5 7) 6 8) 7 9) 8 1)", // Escalate Bounce
        "1) 9) 2) 8) 3) 7) 4) 6) 5)",                    // Shift Bounce
    ]);
    private readonly _arpeggioPatternRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px; font-size: 12px;", onclick: () => this._openPrompt("arpeggioPattern") }, _.arpeggioPatternLabel), this._arpeggioPatternSelect);
    private readonly _chordDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._arpeggioSpeedRow, this._twoNoteArpRow, this._arpeggioPatternSelectedText, this._arpeggioPatternRow);
    private readonly _strumDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._strumSpeedRow);

    private readonly _vibratoSelect: HTMLSelectElement = buildOptions(select(), [
        _.vibrato1Label,
        _.vibrato2Label,
        _.vibrato3Label,
        _.vibrato4Label,
        _.vibrato5Label
    ]);
    private readonly _vibratoDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Vibrato) }, "▼");
    private readonly _vibratoSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("vibrato") }, span(_.vibratoLabel)), this._vibratoDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoSelect));
    private readonly _vibratoDepthSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["vibrato depth"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoDepth(this._doc, oldValue, newValue), false);
    private readonly _vibratoDepthRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px; font-size: x-small;", onclick: () => this._openPrompt("vibratoDepth") }, span(_.vibratoDepthLabel)), this._vibratoDepthSlider.container);
    private readonly _vibratoSpeedDisplay: HTMLSpanElement = span({ style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`, class: "tip", onclick: () => this._openPrompt("x") }, "x1");
    private readonly _vibratoSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["vibrato speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoSpeed(this._doc, oldValue, newValue), false);
    private readonly _vibratoSpeedRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px; font-size: smaller;", onclick: () => this._openPrompt("vibratoSpeed") }, span(_.vibratoSpeedLabel)), this._vibratoSpeedDisplay, this._vibratoSpeedSlider.container);
    private readonly _vibratoDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["vibrato delay"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoDelay(this._doc, oldValue, newValue), false);
    private readonly _vibratoDelayRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("vibratoDelay") }, span(_.vibratoDelayLabel)), this._vibratoDelaySlider.container);
    private readonly _vibratoTypeSelect: HTMLSelectElement = buildOptions(select(), [
        _.vibratoNormalLabel,
        _.vibratoShakyLabel
    ]);
    private readonly _vibratoTypeSelectRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("vibratoType") }, span(_.vibratoTypeLabel)), div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoTypeSelect));
    private readonly _vibratoDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._vibratoDepthRow, this._vibratoSpeedRow, this._vibratoDelayRow, this._vibratoTypeSelectRow);
    private readonly _phaseModGroup: HTMLElement = div({ class: "editor-controls" });
    private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select(), Config.feedbacks.map(feedback => feedback.name));
    private readonly _feedbackRow1: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, span(_.feedbackLabel)), div({ class: "selectContainer" }, this._feedbackTypeSelect));
    private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, null);
    // Issue#12 - Spectrum improvements. Add a zoom-in prompt for spectrum (and possibly drumset/ADVdrumset).
    private readonly _spectrumRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("spectrum") }, span(_.spectrumLabel)), this._spectrumEditor.container);
    private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this._doc);
    /*private readonly _harmonicsCopyButton: HTMLButtonElement = button({ style: "max-width:40px; width: 40px;", class: "copyButton", title: _.copyLabel }, [
        (_.copyLabel),
        // Copy icon:
        SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -0.75em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
            SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
        ]),
    ]);
    private readonly _harmonicsPasteButton: HTMLButtonElement = button({ style: "max-width:40px;", class: "pasteButton", title: _.pasteLabel }, [
        (_.pasteLabel),
        // Paste icon:
        SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -0.75em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
            SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
            SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
        ]),
    ]);*/
    // Issue#12 - Harmonics improvements. Add a zoom-in prompt for harmonics and picked string harmonics.
    // private readonly _harmonicsZoom: HTMLButtonElement = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: () => this._openPrompt("harmonicsSettings") }, "+");
    private readonly _harmonicsRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("harmonics") }, span(_.harmonicsLabel)), /*this._harmonicsZoom,*/ this._harmonicsEditor.container);
    //private readonly _harmonicsCopyPasteRow: HTMLDivElement = div({class: "selectRow", style: "width: 90px; align-content: space-between; align-self: right;" }, this._harmonicsCopyButton, this._harmonicsPasteButton);
    
    private readonly _envelopeEditor: EnvelopeEditor = new EnvelopeEditor(this._doc, (name) => this._openPrompt(name));
    private readonly _envelopeSpeedDisplay: HTMLSpanElement = span({ style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`, class: "tip", onclick: () => this._openPrompt("x") }, "x1");
    private readonly _envelopeSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["envelope speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEnvelopeSpeed(this._doc, oldValue, newValue), false);
    // Issue#59 - Add input boxes to various speed/delay sliders for more accurate inputs.
    private readonly _envelopeSpeedRow: HTMLElement = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("envelopeSpeed") }, _.envelopeSpeedLabel), this._envelopeSpeedDisplay, this._envelopeSpeedSlider.container);
    private readonly _envelopeDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._envelopeSpeedRow);
    private readonly _envelopeDropdown: HTMLButtonElement = button({ style: "margin-left:0em; margin-right: 1em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Envelope) }, "▼");
    
    private readonly _drumsetGroup: HTMLElement = div({ class: "editor-controls" });
    private readonly _modulatorGroup: HTMLElement = div({ class: "editor-controls" });
    private readonly _modNameRows: HTMLElement[];
    private readonly _modChannelBoxes: HTMLSelectElement[];
    private readonly _modInstrumentBoxes: HTMLSelectElement[];
    private readonly _modSetRows: HTMLElement[];
    private readonly _modSetBoxes: HTMLSelectElement[];
    private readonly _modFilterRows: HTMLElement[];
    private readonly _modFilterBoxes: HTMLSelectElement[];
    private readonly _modTargetIndicators: SVGElement[];

    private readonly _feedback6OpTypeSelect: HTMLSelectElement = buildOptions(select(), Config.feedbacks6Op.map(feedback => feedback.name));
    private readonly _feedback6OpRow1: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, _.feedbackLabel), div({ class: "selectContainer" }, this._feedback6OpTypeSelect));

    private readonly _algorithmCanvasSwitch: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: (e:Event) => this._toggleAlgorithmCanvas(e) }, "F");
    private readonly _customAlgorithmCanvas: CustomAlgorithmCanvas = new CustomAlgorithmCanvas(canvas({ width: 144, height: 144, style: "border:2px solid " + ColorConfig.uiWidgetBackground, id: "customAlgorithmCanvas" }), this._doc, (newArray: number[][], carry: number, mode: string) => new ChangeCustomAlgorithmOrFeedback(this._doc, newArray, carry, mode));
    private readonly _algorithm6OpSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms6Op.map(algorithm => algorithm.name));
    private readonly _algorithm6OpSelectRow: HTMLDivElement = div(div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, _.algorithmLabel), div({ class: "selectContainer" }, this._algorithm6OpSelect))
        , div({ style: "height:144px; display:flex; flex-direction: row; align-items:center; justify-content:center;" }, div({style:"display:block; width:10px; margin-right: 0.2em"},this._algorithmCanvasSwitch), div({style: "width:144px; height:144px;"},this._customAlgorithmCanvas.canvas)));

    private readonly _instrumentCopyButton: HTMLButtonElement = button({ style: "max-width:86px; width: 86px;", class: "copyButton", title: _.copyInstrumentLabel }, [
        (_.copyLabel),
        // Copy icon:
        SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
            SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
        ]),
    ]);
    private readonly _instrumentPasteButton: HTMLButtonElement = button({ style: "max-width:86px;", class: "pasteButton", title: _.pasteInstrumentLabel }, [
        (_.pasteLabel),
        // Paste icon:
        SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
            SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
            SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
        ]),
    ]);

    // Issue#26 - Add other oscilloscope types. The main one planned is equalizers, so use a "?" statement here to pick between oscilloscope and equalizers.
    public readonly _globalOscilloscope: oscilloscopeCanvas = new oscilloscopeCanvas(canvas({ width: 144, height: 32, style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; position: static;`, id: "oscilloscopeAll" }), 1);
    private readonly _globalOscilloscopeContainer: HTMLDivElement = div({ style: "height: 38px; margin-left: auto; margin-right: auto;" },
        this._globalOscilloscope.canvas
    );
    private readonly _oscilloscopeScaleSlider: Slider = new Slider(input({ style: "width: 120px; flex-grow: 1; margin: 0;", type: "range", min: "0.25", max: "5", value: "1", step: "0.25" }), this._doc, null, false);
    private readonly _oscilloscopeScaleRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("oscilloscopeScaling") }, span(_.oscilloscopeScaleLabel)), this._oscilloscopeScaleSlider.container);

    private readonly _customWaveDrawCanvas: CustomChipCanvas = new CustomChipCanvas(canvas({ width: 128, height: 52, style: "border:2px solid " + ColorConfig.uiWidgetBackground, id: "customWaveDrawCanvas" }), this._doc, (newArray: Float32Array) => new ChangeCustomWave(this._doc, newArray));
    private readonly _wavetableCustomWaveDrawCanvas: WavetableCustomChipCanvas = new WavetableCustomChipCanvas(canvas({ width: 128, height: 52, style: "border:2px solid " + ColorConfig.uiWidgetBackground, id: "customWaveDrawCanvas" }), this._doc, (newArray: Float32Array) => new ChangeWavetableCustomWave(this._doc, newArray, this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()]));

    private readonly _customWavePresetDrop: HTMLSelectElement = buildHeaderedOptions(_.loadPresetLabel, select({ style: "width: 50%; height:1.5em; text-align: center; text-align-last: center;" }),
        Config.chipWaves.map(wave => wave.name));
    private readonly _wavetableCustomWavePresetDrop: HTMLSelectElement = buildHeaderedOptions(_.loadPresetLabel, select({ style: "width: 50%; height:1.5em; text-align: center; text-align-last: center;" }),
        Config.chipWaves.map(wave => wave.name));

    private readonly _customWaveZoom: HTMLButtonElement = button({ style: "margin-left:0.5em; height:1.5em; max-width: 20px;", onclick: () => this._openPrompt("customChipSettings") }, "+");
    private readonly _wavetableCustomWaveZoom: HTMLButtonElement = button({ style: "margin-left:0.5em; height:1.5em; max-width: 20px;", onclick: () => this._openPrompt("wavetableCustomChipSettings") }, "+");

    private readonly _customWaveCopy: HTMLButtonElement = button({ style: "width:58px; height:1.5em; text-align: right;", class: "copyButton" }, [
		_.copyLabel,
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -0.75em; pointer-events: none;", width: "1.5em", height: "1.5em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
    private readonly _customWavePaste: HTMLButtonElement = button({ style: "width:58px; height:1.5em; text-align: right;", class: "pasteButton" }, [
		_.pasteLabel,
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -0.75em; pointer-events: none;", width: "1.5em", height: "1.5em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);
    private readonly _customWaveCopyPasteContainer: HTMLDivElement = div({class: "selectRow", style: "width: 124px; align-content: space-between;" }, this._customWaveCopy, this._customWavePaste);
    private readonly _wavetableCustomWaveCopy: HTMLButtonElement = button({ style: "width:58px; height:1.5em; text-align: right;", class: "copyButton" }, [
		_.copyLabel,
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -0.75em; pointer-events: none;", width: "1.5em", height: "1.5em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
    private readonly _wavetableCustomWavePaste: HTMLButtonElement = button({ style: "width:58px; height:1.5em; text-align: right;", class: "pasteButton" }, [
		_.pasteLabel,
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -0.75em; pointer-events: none;", width: "1.5em", height: "1.5em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);
    private readonly _wavetableCustomWaveCopyPasteContainer: HTMLDivElement = div({class: "selectRow", style: "width: 124px; align-content: space-between;" }, this._wavetableCustomWaveCopy, this._wavetableCustomWavePaste);

    private readonly _customWaveDraw: HTMLDivElement = div({ style: "height:80px; margin-top:10px; margin-bottom:25px;" }, [
        div({ style: "height:54px; display:flex; justify-content:center;" }, [this._customWaveDrawCanvas.canvas]),
        div({ style: "margin-top:5px; display:flex; justify-content:center;" }, [this._customWavePresetDrop, this._customWaveZoom]),
        div({ style: "margin-top:1px; display:flex; justify-content:center;" }, [this._customWaveCopyPasteContainer]),
    ]);

    private readonly _wavetableCustomWaveDraw: HTMLDivElement = div({ style: "height:80px; margin-top:10px; margin-bottom:25px;" }, [
        div({ style: "height:54px; display:flex; justify-content:center;" }, [this._wavetableCustomWaveDrawCanvas.canvas]),
        div({ style: "margin-top:5px; display:flex; justify-content:center;" }, [this._wavetableCustomWavePresetDrop, this._wavetableCustomWaveZoom]),
        div({ style: "margin-top:1px; display:flex; justify-content:center;" }, [this._wavetableCustomWaveCopyPasteContainer]),
    ]);

    private readonly _songTitleInputBox: InputBox = new InputBox(input({ style: "font-weight:bold; border:none; width: 96%; background-color:${ColorConfig.editorBackground}; color:${ColorConfig.primaryText}; text-align:center", maxlength: "30", type: "text", value: EditorConfig.versionDisplayName }), this._doc, (oldValue: string, newValue: string) => new ChangeSongTitle(this._doc, oldValue, newValue));
    private readonly _songSubtitleInputBox: InputBox = new InputBox(input({ style: "font-weight:bold; font-size:12px; border:none; width: 90%; background-color:${ColorConfig.editorBackground}; color: " + ColorConfig.secondaryText + " text-align:center", maxlength: "30", type: "text", }), this._doc, (oldValue: string, newValue: string) => new ChangeSongSubtitle(this._doc, oldValue, newValue));

    private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: _.hoverText12Label }), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue), false);
    private readonly _feedbackRow2: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackVolume") }, span(_.feedbackVolumeLabel)), this._feedbackAmplitudeSlider.container);
    /*
     * @jummbus - my very real, valid reason for cutting this button: I don't like it.
     * 
    private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: 2px 0"},

        "Customize Instrument",
    );
    */
    private readonly _addEnvelopeButton: HTMLButtonElement = button({ type: "button", class: "add-envelope" });
    private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({ class: "editor-controls" },
        this._panSliderRow,
        this._panDropdownGroup,
        this._chipWaveSelectRow,
        this._chipNoiseSelectRow,
        //this._isNoiseSeedRandomizedRow,
        //this._noiseSeedRow,
        this._wavetableWaveButtonsContainer,
        this._customWaveDraw,
        this._wavetableCustomWaveDraw,
        this._eqFilterTypeRow,
        this._eqFilterRow,
        this._eqFilterSimpleCutRow,
        this._eqFilterSimplePeakRow,
        this._fadeInOutRow,
        this._algorithmSelectRow,
        this._algorithm6OpSelectRow,
        this._phaseModGroup,
        this._feedbackRow1,
        this._feedback6OpRow1,
        this._feedbackRow2,
        this._spectrumRow,
        this._harmonicsRow,
        //this._harmonicsCopyPasteRow,
        this._drumsetGroup,
        this._supersawDynamismRow,
		this._supersawSpreadRow,
		this._supersawShapeRow,
        this._pulseWidthRow,
        this._wavetableSpeedRow,
        this._interpolateWavesRow,
        this._resetCyclePerNoteRow,
        this._oneShotCycleRow,
        this._stringSustainRow,
        this._unisonSelectRow,
        this._unisonDropdownGroup,
        div({ style: `padding: 2px 0; margin-left: 2em; display: flex; align-items: center;` },
            span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("effects") }, span(_.effectsLabel))),
            div({ class: "effects-menu" }, this._effectsSelect),
        ),
        this._transitionRow,
        this._transitionDropdownGroup,
        this._chordSelectRow,
        this._chordDropdownGroup,
        this._strumDropdownGroup,
        this._pitchShiftRow,
        this._detuneSliderRow,
        this._vibratoSelectRow,
        this._vibratoDropdownGroup,
        this._noteFilterTypeRow,
        this._noteFilterRow,
        this._noteFilterSimpleCutRow,
        this._noteFilterSimplePeakRow,
        this._distortionRow,
        this._aliasingRow,
        this._bitcrusherQuantizationRow,
        this._bitcrusherFreqRow,
        this._wavefoldLowerRow,
        this._wavefoldUpperRow,
        this._chorusRow,
        this._echoSustainRow,
        this._echoDelayRow,
        this._reverbRow,
        this._percussionRow,
        this._songDetuneEffectedRow,
        this._songOctaveEffectedRow,
        div({ style: `padding: 2px 0; margin-left: 2em; display: flex; align-items: center;` },
            span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("envelopes") }, span(_.envelopesLabel))),
            this._envelopeDropdown,
            this._addEnvelopeButton,
        ),
        this._envelopeDropdownGroup,
        this._envelopeEditor.container,
    );
    private readonly _instrumentCopyGroup: HTMLDivElement = div({ class: "editor-controls" },
        div({ class: "selectRow" },
            this._instrumentCopyButton,
            this._instrumentPasteButton,
        ),
    );
    private readonly _instrumentSettingsTextRow: HTMLDivElement = div({ id: "instrumentSettingsText", style: `padding: 3px 0; max-width: 15em; text-align: center; color: ${ColorConfig.secondaryText};` },
        (_.instSettingsLabel),
    );
    private readonly _instrumentTypeSelectRow: HTMLDivElement = div({ class: "selectRow", id: "typeSelectRow" },
        span({ class: "tip", onclick: () => this._openPrompt("instrumentType") }, span(_.instTypeLabel)),
        div(
            div({ class: "pitchSelect" }, this._pitchedPresetSelect),
            div({ class: "drumSelect" }, this._drumPresetSelect)
        ),
    );
    private readonly _instrumentSettingsGroup: HTMLDivElement = div({ class: "editor-controls" },
        this._instrumentSettingsTextRow,
        this._instrumentsButtonRow,
        this._instrumentTypeSelectRow,
        this._instrumentVolumeSliderRow,
        this._customInstrumentSettingsGroup,
    );
    private readonly _usedPatternIndicator: SVGElement = SVG.path({ d: "M -6 -6 H 6 V 6 H -6 V -6 M -2 -3 L -2 -3 L -1 -4 H 1 V 4 H -1 V -1.2 L -1.2 -1 H -2 V -3 z", fill: ColorConfig.indicatorSecondary, "fill-rule": "evenodd" });
    private readonly _usedInstrumentIndicator: SVGElement = SVG.path({ d: "M -6 -0.8 H -3.8 V -6 H 0.8 V 4.4 H 2.2 V -0.8 H 6 V 0.8 H 3.8 V 6 H -0.8 V -4.4 H -2.2 V 0.8 H -6 z", fill: ColorConfig.indicatorSecondary });
    private readonly _jumpToModIndicator: SVGElement = SVG.svg({ style: "width: 92%; height: 1.3em; flex-shrink: 0; position: absolute;", viewBox: "0 0 200 200" }, [
        SVG.path({ d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z" }),
        SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
        SVG.path({ d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z" }),
        SVG.path({ d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z" }),
        SVG.path({ d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z" })]);

    private readonly _promptContainer: HTMLDivElement = div({ class: "promptContainer", style: "display: none;" });
    private readonly _zoomInButton: HTMLButtonElement = button({ class: "zoomInButton", type: "button", title: _.hoverText10Label });
    private readonly _zoomOutButton: HTMLButtonElement = button({ class: "zoomOutButton", type: "button", title: _.hoverText11Label });
    private readonly _patternEditorRow: HTMLDivElement = div({ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" },
        this._patternEditorPrev.container,
        this._patternEditor.container,
        this._patternEditorNext.container,
    );
    private readonly _patternArea: HTMLDivElement = div({ class: "pattern-area" },
        this._piano.container,
        this._patternEditorRow,
        this._octaveScrollBar.container,
        this._zoomInButton,
        this._zoomOutButton,
    );
    private readonly _trackContainer: HTMLDivElement = div({ class: "trackContainer" },
        this._trackEditor.container,
        this._loopEditor.container,
    );
    private readonly _trackVisibleArea: HTMLDivElement = div({ style: "position: absolute; width: 100%; height: 100%; pointer-events: none;" });
    private readonly _trackAndMuteContainer: HTMLDivElement = div({ class: "trackAndMuteContainer" },
        this._muteEditor.container,
        this._trackContainer,
        this._trackVisibleArea,
    );
    public readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc);
    private readonly _trackArea: HTMLDivElement = div({ class: "track-area" },
        this._trackAndMuteContainer,
        this._barScrollBar.container,
    );

    private readonly _menuArea: HTMLDivElement = div({ class: "menu-area" },
        div({ class: "selectContainer menu file" },
            this._fileMenu,
        ),
        div({ class: "selectContainer menu edit" },
            this._editMenu,
        ),
        div({ class: "selectContainer menu preferences" },
            this._optionsMenu,
        ),
    );
    private readonly _songSettingsArea: HTMLDivElement = div({ class: "song-settings-area" },
        div({ class: "editor-controls" },
            div({ class: "editor-song-settings" },
                div({ style: "margin: 3px 0; position: relative; text-align: center; color: ${ColorConfig.secondaryText};" },
                    div({ class: "tip", style: "flex-shrink: 0; position:absolute; left: 0; top: 0; width: 12px; height: 12px", onclick: () => this._openPrompt("usedPattern") },
                        SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "0.5em", viewBox: "-6 -6 12 12" },
                            this._usedPatternIndicator,
                        ),
                    ),
                    div({ class: "tip", style: "flex-shrink: 0; position: absolute; left: 14px; top: 0; width: 12px; height: 12px", onclick: () => this._openPrompt("usedInstrument") },
                        SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "1em", viewBox: "-6 -6 12 12" },
                            this._usedInstrumentIndicator,
                        ),
                    ),
                    span(_.songSettingsLabel),
                    div({ style: "width: 100%; left: 0; top: -1px; position:absolute; overflow-x:clip;" }, this._jumpToModIndicator),
                ),
            ),
            div({ class: "selectRow" },
                span({ class: "tip", onclick: () => this._openPrompt("scale") }, span(_.songScaleLabel)),
                div({ class: "selectContainer" }, this._scaleSelect),
            ),
            div({ class: "selectRow" },
                span({ class: "tip", onclick: () => this._openPrompt("key") }, span(_.songKeyLabel)),
                div({ class: "selectContainer" }, this._keySelect),
            ),
            div({ class: "selectRow" },
                span({ class: "tip", onclick: () => this._openPrompt("key_octave") }, span(_.songKeyOctaveLabel)),
                this._octaveStepper,
            ),
            div({ class: "selectRow" },
                span({ class: "tip", onclick: () => this._openPrompt("tempo") }, span(_.songTempoLabel)),
                span({ style: "display: flex;" },
                    this._tempoSlider.container,
                    this._tempoStepper,
                ),
            ),
            div({ class: "selectRow" },
                span({ class: "tip", onclick: () => this._openPrompt("rhythm") }, span(_.songRhythmLabel)),
                div({ class: "selectContainer" }, this._rhythmSelect),
            ),
        ),
    );
    private readonly _instrumentSettingsArea: HTMLDivElement = div({ class: "instrument-settings-area" },
        this._instrumentSettingsGroup,
        this._modulatorGroup);
    public readonly _settingsArea: HTMLDivElement = div({ class: "settings-area noSelection" },
        div({ class: "version-area" },
            div({ style: `text-align: center; margin: 3px 0; color: ${ColorConfig.secondaryText};` },
                this._songTitleInputBox.input,
                this._songSubtitleInputBox.input,
            ),
        ),
        div({ class: "play-pause-area" },
            this._volumeBarBox,
            div({ class: "playback-bar-controls" },
                this._playButton,
                this._pauseButton,
                this._recordButton,
                this._stopButton,
                this._prevBarButton,
                this._nextBarButton,
            ),
            div({ class: "playback-volume-controls" },
                span({ class: "volume-speaker" }),
                this._volumeSlider.container,
            ),
            this._globalOscilloscopeContainer,
            this._oscilloscopeScaleRow,
        ),
        this._menuArea,
        this._songSettingsArea,
        this._instrumentSettingsArea,
    );

    public readonly mainLayer: HTMLDivElement = div({ class: "beepboxEditor", tabIndex: "0" },
        this._patternArea,
        this._trackArea,
        this._settingsArea,
        this._promptContainer,
    );

    private _wasPlaying: boolean = false;
    private _currentPromptName: string | null = null;
    private _highlightedInstrumentIndex: number = -1;
    private _highlightedWavetableIndices: number[][] = [];
    public _wavetableIndices: number[][] = [];
    private _currentlySeenWavetableChannel: number = -1;
    private _currentlySeenWavetableInstrument: number = -1;
    private _renderedInstrumentCount: number = 0;
    private _renderedIsPlaying: boolean = false;
    private _renderedIsRecording: boolean = false;
    private _renderedShowRecordButton: boolean = false;
    private _renderedCtrlHeld: boolean = false;
    private _ctrlHeld: boolean = false;
    private _shiftHeld: boolean = false;
    private _deactivatedInstruments: boolean = false;
    private readonly _operatorRows: HTMLDivElement[] = [];
    private readonly _operatorAmplitudeSliders: Slider[] = [];
    private readonly _operatorFrequencySelects: HTMLSelectElement[] = [];
    private readonly _operatorDropdowns: HTMLButtonElement[] = [];
    private readonly _operatorWaveformSelects: HTMLSelectElement[] = [];
    private readonly _operatorWaveformHints: HTMLSpanElement[] = [];
    private readonly _operatorWaveformPulsewidthSliders: Slider[] = [];
    private readonly _operatorDropdownRows: HTMLElement[] = []
    private readonly _operatorDropdownGroups: HTMLDivElement[] = [];
    private readonly _drumsetSpectrumEditors: SpectrumEditor[] = [];
    private readonly _drumsetEnvelopeSelects: HTMLSelectElement[] = [];
    private readonly _drumsetEnvelopeSpeedSliders: Slider[] = [];
    private readonly _drumsetEnvelopeSpeedInputBoxes: HTMLInputElement[] = [];
    private readonly _drumsetEnvelopeSpeedRows: HTMLDivElement[] = [];
    private readonly _drumsetEnvelopeDropdownGroups: HTMLDivElement[] = [];
    private readonly _drumsetEnvelopeDropdowns: HTMLButtonElement[] = [];
    private _showModSliders: boolean[] = [];
    private _newShowModSliders: boolean[] = [];
    private _modSliderValues: number[] = [];
    private _hasActiveModSliders: boolean = false;

    private _openPanDropdown: boolean = false;
    private _openVibratoDropdown: boolean = false;
    private _openEnvelopeDropdown: boolean = false;
    private _openChordDropdown: boolean = false;
    private _openChordDropdown2: boolean = false;
    private _openTransitionDropdown: boolean = false;
    private _openOperatorDropdowns: boolean[] = [];
    private _openUnisonDropdown: boolean = false;
    private _openDrumsetEnvDropdowns: boolean[] = [];

    private outVolumeHistoricTimer: number = 0;
    private outVolumeHistoricCap: number = 0;
    private lastOutVolumeCap: number = 0;
    public patternUsed: boolean = false;
    private _modRecTimeout: number = -1;

    constructor(private _doc: SongDocument) {

        this._doc.notifier.watch(this.whenUpdated);
        this._doc.modRecordingHandler = () => { this.handleModRecording() };
        new MidiInputHandler(this._doc);
        window.addEventListener("resize", this.whenUpdated);
        window.requestAnimationFrame(this.updatePlayButton);
        window.requestAnimationFrame(this._animate);

        if (!("share" in navigator)) {
            this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']")!);
        }

        this._scaleSelect.appendChild(optgroup({ label: (_.editLabel) },
            option({ value: "forceScale" }, span(_.snapScaleLabel)),
            option({ value: "customize" }, span(_.customizeScaleLabel)),
        ));
        this._keySelect.appendChild(optgroup({ label: (_.editLabel) },
            option({ value: "detectKey" }, span(_.detectKeyLabel)),
        ));
        this._rhythmSelect.appendChild(optgroup({ label: (_.editLabel) },
            option({ value: "forceRhythm" }, span(_.snapRhythmLabel)),
        ));

        this._vibratoSelect.appendChild(option({ hidden: true, value: 5 }, span(_.customLabel)));

        this._unisonSelect.appendChild(option({ hidden: true, value: Config.unisons.length }, _.customLabel));

        this._showModSliders = new Array<boolean>(Config.modulators.length);
        this._modSliderValues = new Array<number>(Config.modulators.length);

        this._phaseModGroup.appendChild(div({ class: "selectRow", style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;` },
            div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."),
            div({ style: "width: 3em; margin-right: .3em;", class: "tip", onclick: () => this._openPrompt("operatorFrequency") }, span(_.operFreqLabel)),
            div({ class: "tip", onclick: () => this._openPrompt("operatorVolume") }, span(_.operVolumeLabel)),
        ));
        for (let i: number = 0; i < Config.operatorCount+2; i++) {
            const operatorIndex: number = i;
            const operatorNumber: HTMLDivElement = div({ style: "margin-right: 0px; color: " + ColorConfig.secondaryText + ";" }, i + 1 + "");
            const frequencySelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: _.hoverText6Label }), Config.operatorFrequencies.map(freq => freq.name));
            const amplitudeSlider: Slider = new Slider(input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: _.hoverText7Label }), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue), false);
            const waveformSelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: _.hoverText8Label }), [
                _.waveform1Label,
                _.waveform2Label,
                _.waveform3Label,
                _.waveform4Label,
                _.waveform5Label,
                _.waveform6Label,
                _.waveform7Label,
                _.waveform8Label,
                _.waveform9Label,
                _.waveform10Label,
                _.waveform11Label,
                _.waveform12Label

            ]);
            const waveformDropdown: HTMLButtonElement = button({ style: "margin-left:0em; margin-right: 2px; height:1.5em; width: 8px; max-width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.FM, i) }, "▼");
            const waveformDropdownHint: HTMLSpanElement = span({ class: "tip", style: "margin-left: 10px;", onclick: () => this._openPrompt("operatorWaveform") }, span(_.operWaveLabel));
            const waveformPulsewidthSlider: Slider = new Slider(input({ style: "", type: "range", min: "1", max: (Config.pulseWidthRange * 2) - 1, value: "0", step: "1", title: _.hoverText9Label }), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorPulseWidth(this._doc, operatorIndex, oldValue, newValue), true);
            waveformPulsewidthSlider.container.style.marginLeft = "10px";
            waveformPulsewidthSlider.container.style.width = "50%";
            const waveformDropdownRow: HTMLElement = div({ class: "selectRow" }, waveformDropdownHint, waveformPulsewidthSlider.container,
                div({ class: "selectContainer", style: "width: 6em; margin-left: .3em;" }, waveformSelect));
            const waveformDropdownGroup: HTMLDivElement = div({ class: "operatorRow" }, waveformDropdownRow);
            const row: HTMLDivElement = div({ class: "selectRow" },
                operatorNumber,
                waveformDropdown,
                div({ class: "selectContainer", style: "width: 3em; margin-right: .3em;" }, frequencySelect),
                amplitudeSlider.container,
            );
            this._phaseModGroup.appendChild(row);
            this._operatorRows[i] = row;
            this._operatorAmplitudeSliders[i] = amplitudeSlider;
            this._operatorFrequencySelects[i] = frequencySelect;
            this._operatorDropdowns[i] = waveformDropdown;
            this._operatorWaveformHints[i] = waveformDropdownHint;
            this._operatorWaveformSelects[i] = waveformSelect;
            this._operatorWaveformPulsewidthSliders[i] = waveformPulsewidthSlider;
            this._operatorDropdownRows[i] = waveformDropdownRow;
            this._phaseModGroup.appendChild(waveformDropdownGroup);
            this._operatorDropdownGroups[i] = waveformDropdownGroup;
            this._openOperatorDropdowns[i] = false;

            waveformSelect.addEventListener("change", () => {
                this._doc.record(new ChangeOperatorWaveform(this._doc, operatorIndex, waveformSelect.selectedIndex));
            });

            frequencySelect.addEventListener("change", () => {
                this._doc.record(new ChangeOperatorFrequency(this._doc, operatorIndex, frequencySelect.selectedIndex));
            });
        }

        {
            const maxChannelCount: number = Config.pitchChannelCountMax;
            const maxInstrumentCount: number = Config.patternInstrumentCountMax;
            for (let i: number = 0; i < maxChannelCount; i++) {
                const channelWavetableIndices: number[] = [];
                const channelWavetableHighlightedIndices: number[] = [];
                for (let j: number = 0; j < maxInstrumentCount; j++) {
                    channelWavetableIndices.push(0);
                    channelWavetableHighlightedIndices.push(-1);
                }
                this._wavetableIndices.push(channelWavetableIndices);
                this._highlightedWavetableIndices.push(channelWavetableHighlightedIndices);
            }
        }

        this._drumsetGroup.appendChild(
            div({ class: "selectRow" },
                span({ class: "tip", onclick: () => this._openPrompt("drumsetEnvelope") }, span(_.envelopesLabel)),
                span({ class: "tip", onclick: () => this._openPrompt("drumsetSpectrum") }, span(_.spectrumLabel)),
            ),
        );
        for (let i: number = Config.drumCount - 1; i >= 0; i--) {
            const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
            const drumIndex: number = i;
            const spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, drumIndex);
            spectrumEditor.container.addEventListener("mousedown", this.refocusStage);

            const envelopeSelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: _.hoverText13Label }), Config.envelopes.map(envelope => envelope.name));

            const envelopeSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1", step: "0.25" }), this._doc, (oldValue: number, newValue: number) => new ChangeDrumEnvelopeSpeed(this._doc, drumIndex, oldValue, newValue), false);
            const envelopeSpeedInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "perEnvelopeSpeedInputBox", type: "number", step: "0.001", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1"});
			const envelopeSpeedRow: HTMLDivElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("perEnvelopeSpeed")}, span(_.perEnvelopeSpeedLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, envelopeSpeedInputBox),
			), envelopeSpeedSlider.container);
            const drumsetEnvelopeDropdownGroup: HTMLDivElement = div({class: "editor-controls", style: "display: none;"}, envelopeSpeedRow);
            const drumsetEnvelopeDropdown: HTMLButtonElement = button({ style: "margin-left: 0.6em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.DrumsetEnv, i) }, "▼");

            envelopeSelect.addEventListener("change", () => {
                this._doc.record(new ChangeDrumsetEnvelope(this._doc, drumIndex, envelopeSelect.selectedIndex));
            });
            envelopeSpeedInputBox.addEventListener("input", () => { this._doc.record(new ChangeDrumEnvelopeSpeed(this._doc, drumIndex, instrument.drumsetEnvelopeSpeeds[drumIndex], Math.min(Config.perEnvelopeSpeedMax, Math.max(Config.perEnvelopeSpeedMin, +envelopeSpeedInputBox.value)))) });

            this._drumsetSpectrumEditors[i] = spectrumEditor;
            this._drumsetEnvelopeSelects[i] = envelopeSelect;
            this._drumsetEnvelopeSpeedSliders[i] = envelopeSpeedSlider;
            this._drumsetEnvelopeSpeedInputBoxes[i] = envelopeSpeedInputBox;
            this._drumsetEnvelopeSpeedRows[i] = envelopeSpeedRow;
            this._drumsetEnvelopeDropdownGroups[i] = drumsetEnvelopeDropdownGroup;
            this._drumsetEnvelopeDropdowns[i] = drumsetEnvelopeDropdown;
            this._openDrumsetEnvDropdowns[i] = false;

            const row: HTMLDivElement = div(div({ class: "selectRow" },
                div({style: "width: 0; margin-top: 3px;"}, drumsetEnvelopeDropdown),
                div({style: "width: 5em; margin-left: 1.5em; margin-right: 0.3em;"}, envelopeSelect), 
                spectrumEditor.container,
            ), drumsetEnvelopeDropdownGroup);
            this._drumsetGroup.appendChild(row);

            this._drumsetEnvelopeSpeedSliders[i].updateValue(instrument.drumsetEnvelopeSpeeds[i]);
            this._drumsetEnvelopeSpeedInputBoxes[i].value = String(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instrument.drumsetEnvelopeSpeeds[i]));
        }

        this._modNameRows = [];
        this._modChannelBoxes = [];
        this._modInstrumentBoxes = [];
        this._modSetRows = [];
        this._modSetBoxes = [];
        this._modFilterRows = [];
        this._modFilterBoxes = [];
        this._modTargetIndicators = [];
        for (let mod: number = 0; mod < Config.modCount; mod++) {

            let modChannelBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor; text-overflow:ellipsis;" });
            let modInstrumentBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor;" });

            let modNameRow: HTMLDivElement = div({ class: "operatorRow", style: "height: 1em; margin-bottom: 0.65em;" },
                div({ class: "tip", style: "width: 10%; max-width: 5.4em;", id: "modChannelText" + mod, onclick: () => this._openPrompt("modChannel") }, "Ch:"),
                div({ class: "selectContainer", style: 'width: 35%;' }, modChannelBox),
                div({ class: "tip", style: "width: 1.2em; margin-left: 0.8em;", id: "modInstrumentText" + mod, onclick: () => this._openPrompt("modInstrument") }, "Ins:"),
                div({ class: "selectContainer", style: "width: 10%;" }, modInstrumentBox),
            );

            let modSetBox: HTMLSelectElement = select();
            let modFilterBox: HTMLSelectElement = select();
            let modSetRow: HTMLDivElement = div({ class: "selectRow", id: "modSettingText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: () => this._openPrompt("modSet") }, span(_.modSettingLabel)), span({ class: "tip", style: "font-size:x-small;", onclick: () => this._openPrompt("modSetInfo" + mod) }, "?"), div({ class: "selectContainer" }, modSetBox));
            let modFilterRow: HTMLDivElement = div({ class: "selectRow", id: "modFilterText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: () => this._openPrompt("modFilter" + mod) }, span(_.modTargetLabel)), div({ class: "selectContainer" }, modFilterBox));

            // @jummbus: I could template this up above and simply create from the template, especially since I also reuse it in song settings, but unsure how to do that with imperative-html :P
            let modTarget: SVGElement = SVG.svg({ style: "transform: translate(0px, 1px);", width: "1.5em", height: "1em", viewBox: "0 0 200 200" }, [
                SVG.path({ d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z" }),
                SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
                SVG.path({ d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z" }),
                SVG.path({ d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z" }),
                SVG.path({ d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z" })]);

            this._modNameRows.push(modNameRow);
            this._modChannelBoxes.push(modChannelBox);
            this._modInstrumentBoxes.push(modInstrumentBox);
            this._modSetRows.push(modSetRow);
            this._modSetBoxes.push(modSetBox);
            this._modFilterRows.push(modFilterRow);
            this._modFilterBoxes.push(modFilterBox);
            this._modTargetIndicators.push(modTarget);

            this._modulatorGroup.appendChild(div({ style: "margin: 3px 0; font-weight: bold; margin-bottom: 0.7em; text-align: center; color: " + ColorConfig.secondaryText + "; background: " + ColorConfig.uiWidgetBackground + ";" }, ["Modulator " + (mod + 1), modTarget]));
            this._modulatorGroup.appendChild(modNameRow);
            this._modulatorGroup.appendChild(modSetRow);
            this._modulatorGroup.appendChild(modFilterRow);

        }

        // @jummbus - Unsure why this hack is needed for alignment, but I've never been a css wiz...
        this._pitchShiftSlider.container.style.setProperty("transform", "translate(0px, 3px)");
        this._pitchShiftSlider.container.style.setProperty("width", "100%");
        this._echoDelaySlider.container.style.setProperty("transform", "translate(0px, 3px)")
        this._echoDelaySlider.container.style.setProperty("width", "100%");

        this._fileMenu.addEventListener("change", this._fileMenuHandler);
        this._editMenu.addEventListener("change", this._editMenuHandler);
        this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
        this._customWavePresetDrop.addEventListener("change", this._customWavePresetHandler);
        this._wavetableCustomWavePresetDrop.addEventListener("change", this._wavetableCustomWavePresetHandler);
        this._tempoStepper.addEventListener("change", this._whenSetTempo);
        this._scaleSelect.addEventListener("change", this._whenSetScale);
        this._keySelect.addEventListener("change", this._whenSetKey);
        this._octaveStepper.addEventListener("change", this._whenSetOctave);
        this._rhythmSelect.addEventListener("change", this._whenSetRhythm);
        //this._pitchedPresetSelect.addEventListener("change", this._whenSetPitchedPreset);
        //this._drumPresetSelect.addEventListener("change", this._whenSetDrumPreset);
        this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
        this._instrumentsButtonBar.addEventListener("click", this._whenSelectInstrument);
        this._wavetableWaveButtonsContainer.addEventListener("click", this._whenSelectWavetableWave);
        //this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
        this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
        this._algorithm6OpSelect.addEventListener("change", this._whenSet6OpAlgorithm);
        this._feedback6OpTypeSelect.addEventListener("change", this._whenSet6OpFeedbackType);
        this._chipWaveSelect.addEventListener("change", this._whenSetChipWave);
        this._chipNoiseSelect.addEventListener("change", this._whenSetNoiseWave);
        this._transitionSelect.addEventListener("change", this._whenSetTransition);
        this._effectsSelect.addEventListener("change", this._whenSetEffects);
        this._unisonSelect.addEventListener("change", this._whenSetUnison);
        this._chordSelect.addEventListener("change", this._whenSetChord);
        this._arpeggioPatternSelect.addEventListener("change", this._whenSetArpeggioPattern);
        this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
        this._vibratoTypeSelect.addEventListener("change", this._whenSetVibratoType);
        this._playButton.addEventListener("click", this.togglePlay);
        this._pauseButton.addEventListener("click", this.togglePlay);
        this._recordButton.addEventListener("click", this._toggleRecord);
        this._stopButton.addEventListener("click", this._toggleRecord);
        this._customWaveCopy.addEventListener("click", this._copyCustomWave);
        this._customWavePaste.addEventListener("click", this._pasteCustomWave);
        this._wavetableCustomWaveCopy.addEventListener("click", this._copyWavetableCustomWave);
        this._wavetableCustomWavePaste.addEventListener("click", this._pasteWavetableCustomWave);
        // Start recording instead of opening context menu when control-clicking the record button on a Mac.
        this._recordButton.addEventListener("contextmenu", (event: MouseEvent) => {
            if (event.ctrlKey) {
                event.preventDefault();
                this._toggleRecord();
            }
        });
        this._stopButton.addEventListener("contextmenu", (event: MouseEvent) => {
            if (event.ctrlKey) {
                event.preventDefault();
                this._toggleRecord();
            }
        });
        this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
        this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
        this._volumeSlider.input.addEventListener("input", this._setVolumeSlider);
        this._oscilloscopeScaleSlider.input.addEventListener("input", this._setOscilloscopeScaleSlider);
        this._zoomInButton.addEventListener("click", this._zoomIn);
        this._zoomOutButton.addEventListener("click", this._zoomOut);
        this._patternArea.addEventListener("mousedown", this._refocusStageNotEditing);
        this._trackArea.addEventListener("mousedown", this.refocusStage);

        // The song volume slider is styled slightly different than the class' default.
        this._volumeSlider.container.style.setProperty("flex-grow", "1");
        this._volumeSlider.container.style.setProperty("display", "flex");

        this._volumeBarContainer.style.setProperty("flex-grow", "1");
        this._volumeBarContainer.style.setProperty("display", "flex");

        // Also, any slider with a multiplicative effect instead of a replacement effect gets a different mod color, and a round slider.
        this._volumeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
        this._volumeSlider.container.style.setProperty("--mod-border-radius", "50%");
        this._instrumentVolumeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
        this._instrumentVolumeSlider.container.style.setProperty("--mod-border-radius", "50%");
        this._feedbackAmplitudeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
        this._feedbackAmplitudeSlider.container.style.setProperty("--mod-border-radius", "50%");
        for (let i: number = 0; i < Config.operatorCount+2; i++) {
            this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
            this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-border-radius", "50%");
        }

        let thisRef: SongEditor = this;
        for (let mod: number = 0; mod < Config.modCount; mod++) {
            this._modChannelBoxes[mod].addEventListener("change", function () { thisRef._whenSetModChannel(mod); });
            this._modInstrumentBoxes[mod].addEventListener("change", function () { thisRef._whenSetModInstrument(mod); });
            this._modSetBoxes[mod].addEventListener("change", function () { thisRef._whenSetModSetting(mod); });
            this._modFilterBoxes[mod].addEventListener("change", function () { thisRef._whenSetModFilter(mod); });
            this._modTargetIndicators[mod].addEventListener("click", function () { thisRef._whenClickModTarget(mod); });
        }

        this._jumpToModIndicator.addEventListener("click", function () { thisRef._whenClickJumpToModTarget() });

        this._patternArea.addEventListener("mousedown", this.refocusStage);
        this._fadeInOutEditor.container.addEventListener("mousedown", this.refocusStage);
        this._spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
        this._eqFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._noteFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._harmonicsEditor.container.addEventListener("mousedown", this.refocusStage);
        this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
        this._addEnvelopeButton.addEventListener("click", this._addNewEnvelope);
        this._patternArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this._trackArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
        this.mainLayer.addEventListener("keyup", this._whenKeyReleased);
        this.mainLayer.addEventListener("focusin", this._onFocusIn);
        this._instrumentCopyButton.addEventListener("click", this._copyInstrument.bind(this));
        this._instrumentPasteButton.addEventListener("click", this._pasteInstrument.bind(this));

        this._instrumentVolumeSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeVolume(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].volume, Math.min(25.0, Math.max(-25.0, Math.round(+this._instrumentVolumeSliderInputBox.value))))) });
        this._panSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangePan(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].pan, Math.min(100.0, Math.max(0.0, Math.round(+this._panSliderInputBox.value))))) });
        this._pwmSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangePulseWidth(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].pulseWidth, Math.min(Config.pulseWidthRange, Math.max(1.0, Math.round(+this._pwmSliderInputBox.value))))) });
        this._detuneSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeDetune(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].detune, Math.min(Config.detuneMax - Config.detuneCenter, Math.max(Config.detuneMin - Config.detuneCenter, Math.round(+this._detuneSliderInputBox.value))))) });
        //this._noiseSeedInputBox.addEventListener("input", () => { this._doc.record(new ChangeNoiseSeed(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].noiseSeed, Math.min(0, Math.max(Config.maxAmountOfRandomSeeds, Math.round(+this._noiseSeedInputBox.value))))) });
        this._unisonVoicesInputBox.addEventListener("input", () => { this._doc.record(new ChangeUnisonVoices(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].unisonVoices, Math.min(Config.unisonVoicesMax, Math.max(Config.unisonVoicesMin, Math.round(+this._unisonVoicesInputBox.value))))) });
        this._unisonSpreadInputBox.addEventListener("input", () => { this._doc.record(new ChangeUnisonSpread(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].unisonSpread, Math.min(Config.unisonSpreadMax, Math.max(Config.unisonSpreadMin, +this._unisonSpreadInputBox.value)))) });
        this._unisonOffsetInputBox.addEventListener("input", () => { this._doc.record(new ChangeUnisonOffset(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].unisonOffset, Math.min(Config.unisonOffsetMax, Math.max(Config.unisonOffsetMin, +this._unisonOffsetInputBox.value)))) });
        this._unisonExpressionInputBox.addEventListener("input", () => { this._doc.record(new ChangeUnisonExpression(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].unisonExpression, Math.min(Config.unisonExpressionMax, Math.max(Config.unisonExpressionMin, +this._unisonExpressionInputBox.value)))) });
        this._unisonSignInputBox.addEventListener("input", () => { this._doc.record(new ChangeUnisonSign(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].unisonSign, Math.min(Config.unisonSignMax, Math.max(Config.unisonSignMin, +this._unisonSignInputBox.value)))) });
        this._wavefoldLowerInputBox.addEventListener("input", () => { this._doc.record(new ChangeLowerWavefold(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].wavefoldLower, Math.min(Config.wavefoldLowerMax, Math.max(Config.wavefoldLowerMin, +this._wavefoldLowerInputBox.value)))) });
        this._wavefoldUpperInputBox.addEventListener("input", () => { this._doc.record(new ChangeUpperWavefold(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].wavefoldUpper, Math.min(Config.wavefoldUpperMax, Math.max(Config.wavefoldUpperMin, +this._wavefoldUpperInputBox.value)))) });

        this._customWaveDraw.addEventListener("input", () => { this._doc.record(new ChangeCustomWave(this._doc, this._customWaveDrawCanvas.newArray)) });
        this._interpolateWavesBox.addEventListener("input", () => { this._doc.record(new ChangeWaveInterpolation(this._doc, this._interpolateWavesBox.checked)) });
        this._resetCyclePerNoteBox.addEventListener("input", () => { this._doc.record(new ChangeCyclePerNote(this._doc, this._resetCyclePerNoteBox.checked)) });
        this._oneShotCycleBox.addEventListener("input", () => { this._doc.record(new ChangeOneShotCycle(this._doc, this._oneShotCycleBox.checked)) });
        //this._isNoiseSeedRandomizedBox.addEventListener("input", () => { this._doc.record(new ChangeNoiseSeedRandomization(this._doc, this._isNoiseSeedRandomizedBox.checked)) });
        this._twoNoteArpBox.addEventListener("input", () => { this._doc.record(new ChangeFastTwoNoteArp(this._doc, this._twoNoteArpBox.checked)) });
        this._clicklessTransitionBox.addEventListener("input", () => { this._doc.record(new ChangeClicklessTransition(this._doc, this._clicklessTransitionBox.checked)) });
        this._continueThruPatternBox.addEventListener("input", () => { this._doc.record(new ChangeContinueThruPattern(this._doc, this._continueThruPatternBox.checked)) });
        this._aliasingBox.addEventListener("input", () => { this._doc.record(new ChangeAliasing(this._doc, this._aliasingBox.checked)) });
        this._percussionBox.addEventListener("input", () => { this._doc.record(new ChangePercussion(this._doc, this._percussionBox.checked)) });
        this._songDetuneEffectedBox.addEventListener("input", () => { this._doc.record(new ChangeSDAffected(this._doc, this._songDetuneEffectedBox.checked)) });
        this._songOctaveEffectedBox.addEventListener("input", () => { this._doc.record(new ChangeSOAffected(this._doc, this._songOctaveEffectedBox.checked)) });

        /*(this._promptContainer.addEventListener("click", (event) => {
            if (event.target == this._promptContainer) {
                this._doc.undo();
            }
        });*/
        // Commented out because it is really annoying to misclick and get thrown out the prompt as a result.

        (<Function>this._trackAndMuteContainer.addEventListener)("scroll", this._onTrackAreaScroll, {capture: false, passive: true});

        if (isMobile) {
            const autoPlayOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=autoPlay]");
            autoPlayOption.disabled = true;
            autoPlayOption.setAttribute("hidden", "");
        }

        // Beepbox uses availHeight too, but I have a display that fails the check even when one of the other layouts would look better on it. -jummbus
        if (window.screen.availWidth < 710 /*|| window.screen.availHeight < 710*/) {
            const layoutOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=layout]");
            layoutOption.disabled = true;
            layoutOption.setAttribute("hidden", "");
        }
    }

    private _toggleAlgorithmCanvas(e:Event):void {
        if (this._customAlgorithmCanvas.mode != "feedback") {
            this._customAlgorithmCanvas.mode = "feedback";
            (e.target as Element).textContent = "A";
            this._algorithmCanvasSwitch.value = "feedback";
        } else {
            this._customAlgorithmCanvas.mode = "algorithm";
            (e.target as Element).textContent = "F";
        }
        this._customAlgorithmCanvas.redrawCanvas();
    }

    private _toggleDropdownMenu(dropdown: DropdownID, submenu: number = 0): void {
        let target: HTMLButtonElement = this._vibratoDropdown;
        let group: HTMLElement = this._vibratoDropdownGroup;
        switch (dropdown) {
            case DropdownID.Envelope:
                target = this._envelopeDropdown;
                this._openEnvelopeDropdown = this._openEnvelopeDropdown ? false : true;
                group = this._envelopeDropdownGroup;
                break;
            case DropdownID.Vibrato:
                target = this._vibratoDropdown;
                this._openVibratoDropdown = this._openVibratoDropdown ? false : true;
                group = this._vibratoDropdownGroup;
                break;
            case DropdownID.Pan:
                target = this._panDropdown;
                this._openPanDropdown = this._openPanDropdown ? false : true;
                group = this._panDropdownGroup;
                break;
            case DropdownID.Chord:
                target = this._chordDropdown;
                this._openChordDropdown = this._openChordDropdown ? false : true;
                group = this._chordDropdownGroup;
                break;
            case DropdownID.Strum:
                target = this._chordDropdown2;
                this._openChordDropdown2 = this._openChordDropdown2 ? false : true;
                group = this._strumDropdownGroup;
                break;
            case DropdownID.Transition:
                target = this._transitionDropdown;
                this._openTransitionDropdown = this._openTransitionDropdown ? false : true;
                group = this._transitionDropdownGroup;
                break;
            case DropdownID.FM:
                target = this._operatorDropdowns[submenu];
                this._openOperatorDropdowns[submenu] = this._openOperatorDropdowns[submenu] ? false : true;
                group = this._operatorDropdownGroups[submenu];
                break;
            case DropdownID.Unison:
                target = this._unisonDropdown;
                this._openUnisonDropdown = this._openUnisonDropdown ? false : true;
                group = this._unisonDropdownGroup;
                break;
            case DropdownID.DrumsetEnv:
                target = this._drumsetEnvelopeDropdowns[submenu];
                this._openDrumsetEnvDropdowns[submenu] = this._openDrumsetEnvDropdowns[submenu] ? false : true;
                group = this._drumsetEnvelopeDropdownGroups[submenu];
                break;
        }

        if (target.textContent == "▼") {
            let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
            target.textContent = "▲";
            if (group != this._chordDropdownGroup || group != this._strumDropdownGroup) {
                group.style.display = "";
            } // Only show arpeggio dropdown if chord arpeggiates.
            else if (instrument.chord == Config.chords.dictionary["arpeggio"].index) {
                group.style.display = "";
            } // Only show strum dropdown if chord strums.
            else if (Config.chords[instrument.chord].strumParts > 0) {
                group.style.display = "";
            }
        
            for (let i: number = 0; i < group.children.length; i++) {
                // A timeout is needed so that the previous 0s, 0 opacity settings can be applied. They're not done until the group is visible again because display: none prunes animation steps.
                setTimeout(() => {
                    (group.children[i] as HTMLElement).style.animationDelay = '0.17s';
                    (group.children[i] as HTMLElement).style.opacity = '1';}
                );
            }
        }
        else {
            for (let i: number = 0; i < group.children.length; i++) {
                (group.children[i] as HTMLElement).style.animationDelay = '0s';
                (group.children[i] as HTMLElement).style.opacity = '0';
            }
            target.textContent = "▼";
            group.style.display = "none";
        }
    }

    private _modSliderUpdate(): void {

        if (!this._doc.synth.playing) {
            this._hasActiveModSliders = false;
            for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                if (this._showModSliders[setting] == true) {
                    this._showModSliders[setting] = false;
                    this._newShowModSliders[setting] = false;
                    let slider: Slider | null = this.getSliderForModSetting(setting);
                    if (slider != null) {
                        slider.container.classList.remove("modSlider");
                    }
                }
            }
        }
        else {
            let instrument: number = this._doc.getCurrentInstrument();
            const anyModActive: boolean = this._doc.synth.isAnyModActive(this._doc.channel, instrument);

            // Check and update mod values on sliders
            if (anyModActive) {
                let instrument: number = this._doc.getCurrentInstrument();

                function updateModSlider(editor: SongEditor, slider: Slider, setting: number, channel: number, instrument: number): boolean {
                    if (editor._doc.synth.isModActive(setting, channel, instrument)) {
                        let currentVal: number = (editor._doc.synth.getModValue(setting, channel, instrument, false) - Config.modulators[setting].convertRealFactor) / Config.modulators[setting].maxRawVol;
                        if (currentVal != editor._modSliderValues[setting]) {
                            editor._modSliderValues[setting] = currentVal;
                            slider.container.style.setProperty("--mod-position", (currentVal * 96.0 + 2.0) + "%");
                        }
                        return true;
                    }
                    return false;
                }

                // Set mod sliders to present values
                for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                    // Set to last value
                    this._newShowModSliders[setting] = this._showModSliders[setting];
                    // Check for newer value
                    let slider: Slider | null = this.getSliderForModSetting(setting);
                    if (slider != null) {
                        this._newShowModSliders[setting] = updateModSlider(this, slider, setting, this._doc.channel, instrument);
                    }
                }
            }
            else if (this._hasActiveModSliders) {
                // Zero out show-mod-slider settings (since none are active) to kill active mod slider flag
                for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                    this._newShowModSliders[setting] = false;
                }
            }

            // Class or unclass mod sliders based on present status
            if (anyModActive || this._hasActiveModSliders) {
                let anySliderActive: boolean = false;

                for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                    if (this._newShowModSliders[setting] != this._showModSliders[setting]) {
                        this._showModSliders[setting] = this._newShowModSliders[setting];
                        let slider: Slider | null = this.getSliderForModSetting(setting);
                        if (slider != null) {
                            if (this._showModSliders[setting] == true) {
                                slider.container.classList.add("modSlider");
                            }
                            else {
                                slider.container.classList.remove("modSlider");
                            }
                        }
                    }
                    if (this._newShowModSliders[setting] == true)
                        anySliderActive = true;
                }
                this._hasActiveModSliders = anySliderActive;
            }
        }
    }

    public getSliderForModSetting(setting: number): Slider | null {
        switch (setting) {
            case Config.modulators.dictionary["pan"].index:
                return this._panSlider;
            case Config.modulators.dictionary["detune"].index:
                return this._detuneSlider;
            case Config.modulators.dictionary["fm slider 1"].index:
                return this._operatorAmplitudeSliders[0];
            case Config.modulators.dictionary["fm slider 2"].index:
                return this._operatorAmplitudeSliders[1];
            case Config.modulators.dictionary["fm slider 3"].index:
                return this._operatorAmplitudeSliders[2];
            case Config.modulators.dictionary["fm slider 4"].index:
                return this._operatorAmplitudeSliders[3];
            case Config.modulators.dictionary["fm slider 5"].index:
                return this._operatorAmplitudeSliders[4];
            case Config.modulators.dictionary["fm slider 6"].index:
                return this._operatorAmplitudeSliders[5];
            case Config.modulators.dictionary["fm feedback"].index:
                return this._feedbackAmplitudeSlider;
            case Config.modulators.dictionary["pulse width"].index:
                return this._pulseWidthSlider;
            case Config.modulators.dictionary["reverb"].index:
                return this._reverbSlider;
            case Config.modulators.dictionary["distortion"].index:
                return this._distortionSlider;
            case Config.modulators.dictionary["note volume"].index:
                // So, this should technically not affect this slider, but it will look better as legacy songs used this mod as 'volume'.
                // In the case that mix volume is used as well, they'd fight for the display, so just don't use this.
                if (!this._showModSliders[Config.modulators.dictionary["mix volume"].index])
                    return this._instrumentVolumeSlider;
                return null;
            case Config.modulators.dictionary["mix volume"].index:
                return this._instrumentVolumeSlider;
            case Config.modulators.dictionary["vibrato depth"].index:
                return this._vibratoDepthSlider;
            case Config.modulators.dictionary["vibrato speed"].index:
                return this._vibratoSpeedSlider;
            case Config.modulators.dictionary["vibrato delay"].index:
                return this._vibratoDelaySlider;
            case Config.modulators.dictionary["arp speed"].index:
                return this._arpeggioSpeedSlider;
            case Config.modulators.dictionary["strum speed"].index:
                return this._strumSpeedSlider;
            case Config.modulators.dictionary["pan delay"].index:
                return this._panDelaySlider;
            case Config.modulators.dictionary["tempo"].index:
                return this._tempoSlider;
            case Config.modulators.dictionary["song volume"].index:
                return this._volumeSlider;
            case Config.modulators.dictionary["eq filt cut"].index:
                return this._eqFilterSimpleCutSlider;
            case Config.modulators.dictionary["eq filt peak"].index:
                return this._eqFilterSimplePeakSlider;
            case Config.modulators.dictionary["note filt cut"].index:
                return this._noteFilterSimpleCutSlider;
            case Config.modulators.dictionary["note filt peak"].index:
                return this._noteFilterSimplePeakSlider;
            case Config.modulators.dictionary["bit crush"].index:
                return this._bitcrusherQuantizationSlider;
            case Config.modulators.dictionary["freq crush"].index:
                return this._bitcrusherFreqSlider;
            case Config.modulators.dictionary["pitch shift"].index:
                return this._pitchShiftSlider;
            case Config.modulators.dictionary["chorus"].index:
                return this._chorusSlider;
            case Config.modulators.dictionary["echo"].index:
                return this._echoSustainSlider;
            case Config.modulators.dictionary["echo delay"].index:
                return this._echoDelaySlider;
            case Config.modulators.dictionary["sustain"].index:
                return this._stringSustainSlider;
            case Config.modulators.dictionary["dynamism"].index:
                return this._supersawDynamismSlider;
            case Config.modulators.dictionary["spread"].index:
                return this._supersawSpreadSlider;
            case Config.modulators.dictionary["shape"].index:
                return this._supersawShapeSlider;
            case Config.modulators.dictionary["fm pwm 1"].index:
                return this._operatorWaveformPulsewidthSliders[0];
            case Config.modulators.dictionary["fm pwm 2"].index:
                return this._operatorWaveformPulsewidthSliders[1];
            case Config.modulators.dictionary["fm pwm 3"].index:
                return this._operatorWaveformPulsewidthSliders[2];
            case Config.modulators.dictionary["fm pwm 4"].index:
                return this._operatorWaveformPulsewidthSliders[3];
            case Config.modulators.dictionary["fm pwm 5"].index:
                return this._operatorWaveformPulsewidthSliders[4];
            case Config.modulators.dictionary["fm pwm 6"].index:
                return this._operatorWaveformPulsewidthSliders[5];
            case Config.modulators.dictionary["slide speed"].index:
                return this._slideSpeedSlider;
            case Config.modulators.dictionary["wavetable speed"].index:
                return this._wavetableSpeedSlider;
            case Config.modulators.dictionary["envelope speed"].index:
                return this._envelopeSpeedSlider;
            default:
                return null;
        }
    }

    private _openPrompt(promptName: string): void {
        this._doc.openPrompt(promptName);
        this._setPrompt(promptName);
    }

    private _setPrompt(promptName: string | null): void {
        if (this._currentPromptName == promptName) return;
        this._currentPromptName = promptName;

        if (this.prompt) {
            if (this._wasPlaying && !(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomScalePrompt || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt || this.prompt instanceof WavetablePrompt || this.prompt instanceof SustainPrompt)) {
                this._doc.performance.play();
            }
            this._wasPlaying = false;
            this._promptContainer.style.display = "none";
            this._promptContainer.removeChild(this.prompt.container);
            this.prompt.cleanUp();
            this.prompt = null;
            this.refocusStage();
        }

        if (promptName) {
            switch (promptName) {
                case "export":
                    this.prompt = new ExportPrompt(this._doc);
                    break;
                case "import":
                    this.prompt = new ImportPrompt(this._doc);
                    break;
                case "songRecovery":
                    this.prompt = new SongRecoveryPrompt(this._doc);
                    break;
                case "barCount":
                    this.prompt = new SongDurationPrompt(this._doc);
                    break;
                case "beatsPerBar":
                    this.prompt = new BeatsPerBarPrompt(this._doc);
                    break;
                case "moveNotesSideways":
                    this.prompt = new MoveNotesSidewaysPrompt(this._doc);
                    break;
                case "channelSettings":
                    this.prompt = new ChannelSettingsPrompt(this._doc);
                    break;
                case "limiterSettings":
                    this.prompt = new LimiterPrompt(this._doc, this);
                    break;
                case "customScale":
                    this.prompt = new CustomScalePrompt(this._doc);
                    break;
                case "randomGenSettings":
                    this.prompt = new RandomGenPrompt(this._doc);
                    break;
                case "harmonicsSettings":
                    //this.prompt = new HarmonicsPrompt(this._doc, this); MID TODO: uncomment it again pls dude come on you can do it bruv quit being lazy
                    break;
                case "stringSustain":
					this.prompt = new SustainPrompt(this._doc);
					break;
                case "customChipSettings":
                    this.prompt = new CustomChipPrompt(this._doc, this);
                    break;
                case "wavetableCustomChipSettings":
                    this.prompt = new WavetablePrompt(this._doc, this);
                    break;
                case "customEQFilterSettings":
                    this.prompt = new CustomFilterPrompt(this._doc, this, false);
                    break;
                case "customNoteFilterSettings":
                    this.prompt = new CustomFilterPrompt(this._doc, this, true);
                    break;
                case "language":
                    this.prompt = new LanguagePrompt(this._doc);
                    break;
                case "theme":
                    this.prompt = new ThemePrompt(this._doc);
                    break;
                case "layout":
                    this.prompt = new LayoutPrompt(this._doc);
                    break;
                case "recordingSetup":
                    this.prompt = new RecordingSetupPrompt(this._doc);
                    break;
                case "keybindSetup":
                    this.prompt = new KeybindSetupPrompt(this._doc);
                    break;
                default:
                    this.prompt = new TipPrompt(this._doc, promptName);
                    break;
            }

            if (this.prompt) {
                if (!(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomScalePrompt || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt || this.prompt instanceof WavetablePrompt)) {
                    this._wasPlaying = this._doc.synth.playing;
                    this._doc.performance.pause();
                }
                this._promptContainer.style.display = "";
                this._promptContainer.appendChild(this.prompt.container);
            }
        }
    }

    public refocusStage = (): void => {
        this.mainLayer.focus({ preventScroll: true });
    }

    private _onFocusIn = (event: Event): void => {
        if (this._doc.synth.recording && event.target != this.mainLayer && event.target != this._stopButton && event.target != this._volumeSlider.input) {
            // Don't allow using tab to focus on the song settings while recording,
            // since interacting with them while recording would mess up the recording.
            this.refocusStage();
        }
    }

    // Refocus stage if a sub-element that needs focus isn't being edited.
    private _refocusStageNotEditing = (): void => {
        if (!this._patternEditor.editingModLabel)
            this.mainLayer.focus({ preventScroll: true });
    }

    public changeBarScrollPos(offset: number) {
        this._barScrollBar.changePos(offset);
    }

    public whenUpdated = (): void => {
        const prefs: Preferences = this._doc.prefs;
        this._muteEditor.container.style.display = prefs.enableChannelMuting ? "" : "none";
        const trackBounds: DOMRect = this._trackVisibleArea.getBoundingClientRect();
        this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left - (prefs.enableChannelMuting ? 32 : 0)) / this._doc.getBarWidth());
        this._doc.trackVisibleChannels = Math.floor((trackBounds.bottom - trackBounds.top - 30) / ChannelRow.patternHeight);
		for (let i: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; i < this._doc.song.channels.length; i++) {
            const channel: Channel = this._doc.song.channels[i];
            for (let j: number = 0; j < channel.instruments.length; j++) {
                this._doc.synth.determineInvalidModulators(channel.instruments[j]);
            }
        }
        this._barScrollBar.render();
        this._trackEditor.render();
        this._muteEditor.render();

        this._trackAndMuteContainer.scrollLeft = this._doc.barScrollPos * this._doc.getBarWidth();
		this._trackAndMuteContainer.scrollTop = this._doc.channelScrollPos * ChannelRow.patternHeight;

        if (document.activeElement != this._patternEditor.modDragValueLabel && this._patternEditor.editingModLabel) {
            this._patternEditor.stopEditingModLabel(false);
        }

        this._piano.container.style.display = prefs.showLetters ? "" : "none";
        this._octaveScrollBar.container.style.display = prefs.showScrollBar ? "" : "none";
        this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
        this._volumeBarBox.style.display = this._doc.prefs.displayVolumeBar ? "" : "none";
        this._globalOscilloscopeContainer.style.display = this._doc.prefs.showOscilloscope ? "" : "none";
        this._oscilloscopeScaleRow.style.display = this._doc.prefs.showOscilloscope ? "" : "none";
        this._doc.synth.oscEnabled = this._doc.prefs.showOscilloscope;

        if (this._doc.getFullScreen()) {
            const semitoneHeight: number = this._patternEditorRow.clientHeight / this._doc.getVisiblePitchCount();
            const targetBeatWidth: number = semitoneHeight * 5;
            const minBeatWidth: number = this._patternEditorRow.clientWidth / (this._doc.song.beatsPerBar * 3);
            const maxBeatWidth: number = this._patternEditorRow.clientWidth / (this._doc.song.beatsPerBar + 2);
            const beatWidth: number = Math.max(minBeatWidth, Math.min(maxBeatWidth, targetBeatWidth));
            const patternEditorWidth: number = beatWidth * this._doc.song.beatsPerBar;

            this._patternEditorPrev.container.style.width = patternEditorWidth + "px";
            this._patternEditor.container.style.width = patternEditorWidth + "px";
            this._patternEditorNext.container.style.width = patternEditorWidth + "px";
            this._patternEditorPrev.container.style.flexShrink = "0";
            this._patternEditor.container.style.flexShrink = "0";
            this._patternEditorNext.container.style.flexShrink = "0";
            this._patternEditorPrev.container.style.display = "";
            this._patternEditorNext.container.style.display = "";
            this._patternEditorPrev.render();
            this._patternEditorNext.render();
            this._zoomInButton.style.display = (this._doc.channel < this._doc.song.pitchChannelCount) ? "" : "none";
            this._zoomOutButton.style.display = (this._doc.channel < this._doc.song.pitchChannelCount) ? "" : "none";
            this._zoomInButton.style.right = prefs.showScrollBar ? "24px" : "4px";
            this._zoomOutButton.style.right = prefs.showScrollBar ? "24px" : "4px";
        } else {
            this._patternEditor.container.style.width = "";
            this._patternEditor.container.style.flexShrink = "";
            this._patternEditorPrev.container.style.display = "none";
            this._patternEditorNext.container.style.display = "none";
            this._zoomInButton.style.display = "none";
            this._zoomOutButton.style.display = "none";
        }
        this._patternEditor.render();

        const optionCommands: ReadonlyArray<string> = [
            (prefs.autoPlay ? "✓ " : "　") + (_.autoPlayLabel),
            (prefs.autoFollow ? "✓ " : "　") + (_.autoFollowLabel),
            (prefs.enableNotePreview ? "✓ " : "　") + (_.enableNotePreviewLabel),
            (prefs.showLetters ? "✓ " : "　") + (_.showPianoLabel),
            (prefs.showFifth ? "✓ " : "　") + (_.showFifthLabel),
            (prefs.notesOutsideScale ? "✓ " : "　") + (_.notesOutsideScaleLabel),
            (prefs.defaultScale == this._doc.song.scale ? "✓ " : "　") + (_.setDefaultScaleLabel),
            (prefs.showChannels ? "✓ " : "　") + (_.showAllChannelsLabel),
            (prefs.showScrollBar ? "✓ " : "　") + (_.scrollbarLabel),
            (prefs.alwaysFineNoteVol ? "✓ " : "") + (_.fineNoteVolumeLabel),
            (prefs.enableChannelMuting ? "✓ " : "　") + (_.channelMutingLabel),
            (prefs.displayBrowserUrl ? "✓ " : "　") + (_.displayURLInBrowserLabel),
            (prefs.displayVolumeBar ? "✓ " : "　") + (_.showPlaybackBarLabel),
            (prefs.showOscilloscope ? "✓ " : "　") + (_.showOscilloscopeLabel),
            (_.setLanguageLabel),
            (_.setLayoutLabel),
            (_.setThemeLabel),
            (_.setNoteRecordingLabel),
            (_.keybindSetupLabel),
        ];
        for (let i: number = 0; i < optionCommands.length; i++) {
            const option: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.children[i + 1];
            if (option.textContent != optionCommands[i]) option.textContent = optionCommands[i];
        }

        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrumentIndex: number = this._doc.getCurrentInstrument();
        const instrument: Instrument = channel.instruments[instrumentIndex];
        const wasActive: boolean = this.mainLayer.contains(document.activeElement);
        const activeElement: Element | null = document.activeElement;
        const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);

        for (let i: number = this._effectsSelect.childElementCount - 1; i < Config.effectOrder.length; i++) {
            this._effectsSelect.appendChild(option({ value: i }));
        }
        this._effectsSelect.selectedIndex = -1;
        const translatedEffectNames: string[] = [
            (_.reverbEffectLabel),
            (_.chorusEffectLabel),
            (_.panEffectLabel),
            (_.distortionEffectLabel),
            (_.bitCrushEffectLabel),
            (_.noteFiltEffectLabel),
            (_.echoEffectLabel),
            (_.pitchShiftEffectLabel),
            (_.detuneEffectLabel),
            (_.vibratoEffectLabel),
            (_.transitionEffectLabel),
            (_.chordEffectLabel),
            (_.percussionEffectLabel),
            (_.wavefoldEffectLabel)
        ];
        for (let i: number = 0; i < Config.effectOrder.length; i++) {
            let effectFlag: number = Config.effectOrder[i];
            const selected: boolean = ((instrument.effects & (1 << effectFlag)) != 0);
            const label: string = (selected ? "✓ " : "　") + translatedEffectNames[effectFlag];
            const option: HTMLOptionElement = <HTMLOptionElement>this._effectsSelect.children[i + 1];
            if (option.textContent != label) option.textContent = label;
        }

        setSelectedValue(this._scaleSelect, this._doc.song.scale);
        this._scaleSelect.title = Config.scales[this._doc.song.scale].realName;
        setSelectedValue(this._keySelect, Config.keys.length - 1 - this._doc.song.key);
        this._octaveStepper.value = Math.round(this._doc.song.octave).toString();
        this._tempoSlider.updateValue(Math.max(0, Math.round(this._doc.song.tempo)));
        this._tempoStepper.value = Math.round(this._doc.song.tempo).toString();
        this._songTitleInputBox.updateValue(this._doc.song.title);
        this._songSubtitleInputBox.updateValue(this._doc.song.subtitle);

        this._eqFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
        this._eqFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
        this._eqFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
        this._eqFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);

        if (instrument.eqFilterType) {
            this._eqFilterSimpleButton.classList.remove("deactivated");
            this._eqFilterAdvancedButton.classList.add("deactivated");
            this._eqFilterRow.style.display = "none";
            this._eqFilterSimpleCutRow.style.display = "";
            this._eqFilterSimplePeakRow.style.display = "";
        } else {
            this._eqFilterSimpleButton.classList.add("deactivated");
            this._eqFilterAdvancedButton.classList.remove("deactivated");
            this._eqFilterRow.style.display = "";
            this._eqFilterSimpleCutRow.style.display = "none";
            this._eqFilterSimplePeakRow.style.display = "none";
        }

        setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);

        if (!this._doc.song.getChannelIsMod(this._doc.channel)) {

            this._customInstrumentSettingsGroup.style.display = "";
            this._panSliderRow.style.display = "";
            this._panDropdownGroup.style.display = (this._openPanDropdown ? "" : "none");
            this._detuneSliderRow.style.display = "";
            this._instrumentVolumeSliderRow.style.display = "";
            this._instrumentTypeSelectRow.style.setProperty("display", "");
            this._instrumentSettingsGroup.appendChild(this._instrumentCopyGroup);
            this._instrumentSettingsGroup.insertBefore(this._instrumentsButtonRow, this._instrumentSettingsGroup.firstChild);
            this._instrumentSettingsGroup.insertBefore(this._instrumentSettingsTextRow, this._instrumentSettingsGroup.firstChild);

            if (this._doc.song.channels[this._doc.channel].name == "") {
                this._instrumentSettingsTextRow.textContent = (_.instSettingsLabel);
            }
            else {
                this._instrumentSettingsTextRow.textContent = this._doc.song.channels[this._doc.channel].name;
            }

            this._modulatorGroup.style.display = "none";

            // Check if current viewed pattern on channel is used anywhere
            // + Check if current instrument on channel is used anywhere
            // + Check if a mod targets this
            this._usageCheck(this._doc.channel, instrumentIndex);

            if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
                this._pitchedPresetSelect.style.display = "none";
                this._drumPresetSelect.style.display = "";
                // Also hide select2
                $("#pitchPresetSelect").parent().hide();
                $("#drumPresetSelect").parent().show();

                setSelectedValue(this._drumPresetSelect, instrument.preset, true);
            } else {
                this._pitchedPresetSelect.style.display = "";
                this._drumPresetSelect.style.display = "none";

                // Also hide select2
                $("#pitchPresetSelect").parent().show();
                $("#drumPresetSelect").parent().hide();

                setSelectedValue(this._pitchedPresetSelect, instrument.preset, true);
            }

            if (instrument.type == InstrumentType.noise) {
                this._chipWaveSelectRow.style.display = "none";
                this._chipNoiseSelectRow.style.display = "";
                //this._isNoiseSeedRandomizedRow.style.display = "";
                //if (instrument.noiseSeedRandomization) {
                //    this._noiseSeedRow.style.display = "";
                //} else {
                //    this._noiseSeedRow.style.display = "none";
                //}
                setSelectedValue(this._chipNoiseSelect, instrument.chipNoise, true);
            } else {
                this._chipNoiseSelectRow.style.display = "none";
                //this._isNoiseSeedRandomizedRow.style.display = "none";
                //this._noiseSeedRow.style.display = "none";
            }
            if (instrument.type == InstrumentType.spectrum) {
                this._chipWaveSelectRow.style.display = "none";
                this._spectrumRow.style.display = "";
                this._spectrumEditor.render();
            } else {
                this._spectrumRow.style.display = "none";
            }
            if (instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
                this._chipWaveSelectRow.style.display = "none";
                this._harmonicsRow.style.display = "";
                //this._harmonicsCopyPasteRow.style.display = "";
                this._harmonicsEditor.render();
            } else {
                this._harmonicsRow.style.display = "none";
                //this._harmonicsCopyPasteRow.style.display = "none";
            }
            if (instrument.type == InstrumentType.pickedString) {
                this._chipWaveSelectRow.style.display = "none";
                this._stringSustainRow.style.display = "";
                this._stringSustainSlider.updateValue(instrument.stringSustain);
                this._stringSustainLabel.textContent = Config.enableAcousticSustain ? (_.sustain2Label) + Config.sustainTypeNames[instrument.stringSustainType].substring(0,1).toUpperCase() + "):" : (_.sustainLabel);
            } else {
                this._stringSustainRow.style.display = "none";
            }
            if (instrument.type == InstrumentType.drumset) {
                this._drumsetGroup.style.display = "";
                this._chipWaveSelectRow.style.display = "none";
                this._fadeInOutRow.style.display = "none";
                for (let i: number = 0; i < Config.drumCount; i++) {
                    setSelectedValue(this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
                    this._drumsetSpectrumEditors[i].render();
                    this._drumsetEnvelopeSpeedSliders[i].updateValue(instrument.drumsetEnvelopeSpeeds[i]);
                }
            } else {
                this._drumsetGroup.style.display = "none";
                this._fadeInOutRow.style.display = "";
                this._fadeInOutEditor.render();
            }

            if (instrument.type == InstrumentType.chip) {
                this._chipWaveSelectRow.style.display = "";
                setSelectedValue(this._chipWaveSelect, instrument.chipWave);
            }
            // Place else statement here?

            if (instrument.type == InstrumentType.pwm) {
                this._chipWaveSelectRow.style.display = "none";
                this._pulseWidthRow.style.display = "";
                this._pulseWidthSlider.input.title = prettyNumber(instrument.pulseWidth) + "%";
                this._pulseWidthSlider.updateValue(instrument.pulseWidth);
            } else {
                this._pulseWidthRow.style.display = "none";
            }


            if (instrument.type == InstrumentType.fm || instrument.type == InstrumentType.advfm) {
                this._algorithmSelectRow.style.display = "";
                this._phaseModGroup.style.display = "";
                this._feedbackRow1.style.display = "";
                this._feedbackRow2.style.display = "";
                this._chipWaveSelectRow.style.display = "none";
                setSelectedValue(this._algorithmSelect, instrument.algorithm);
                setSelectedValue(this._feedbackTypeSelect, instrument.feedbackType);
                this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
                for (let i: number = 0; i < Config.operatorCount + (instrument.type == InstrumentType.advfm ? 2 : 0); i++) {
                    const isCarrier: boolean = instrument.type == InstrumentType.fm ? (i < Config.algorithms[instrument.algorithm].carrierCount): (i < instrument.customAlgorithm.carrierCount);
                    this._operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
                    setSelectedValue(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
                    this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
                    setSelectedValue(this._operatorWaveformSelects[i], instrument.operators[i].waveform);
                    this._operatorWaveformPulsewidthSliders[i].updateValue(instrument.operators[i].pulseWidth);
                    this._operatorWaveformPulsewidthSliders[i].input.title = "" + prettyNumber(instrument.operators[i].pulseWidth - instrument.operators[i].pulseWidthDecimalOffset / 100) + "%";
                    this._operatorDropdownGroups[i].style.color = isCarrier ? ColorConfig.primaryText : "";
                    const operatorName: string = (isCarrier ? _.hoverText1Label : _.hoverText2Label) + (i + 1);
                    this._operatorFrequencySelects[i].title = operatorName + _.hoverText3Label;
                    this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? _.hoverText4Label : _.hoverText5Label);
                    this._operatorDropdownGroups[i].style.display = (this._openOperatorDropdowns[i] ? "" : "none");
                    if (instrument.operators[i].waveform == 3) {
                        this._operatorWaveformPulsewidthSliders[i].container.style.display = "";
                        this._operatorWaveformHints[i].style.display = "none";
                    } else {
                        this._operatorWaveformPulsewidthSliders[i].container.style.display = "none";
                        this._operatorWaveformHints[i].style.display = "";
                    }
                }
                if (instrument.type == InstrumentType.advfm) {
                    setSelectedValue(this._algorithm6OpSelect, instrument.algorithm6Op);
                    setSelectedValue(this._feedback6OpTypeSelect, instrument.feedbackType6Op);
                    this._customAlgorithmCanvas.redrawCanvas();
                    this._algorithm6OpSelectRow.style.display = "";
                    this._feedback6OpRow1.style.display = "";
                    this._operatorRows[4].style.display = "";
                    this._operatorRows[5].style.display = "";
                    this._operatorDropdownGroups[4].style.display = (this._openOperatorDropdowns[4] ? "" : "none");
                    this._operatorDropdownGroups[5].style.display = (this._openOperatorDropdowns[5] ? "" : "none");
                    this._algorithmSelectRow.style.display = "none";
                    this._feedbackRow1.style.display = "none";
                } else {
                    this._algorithm6OpSelectRow.style.display = "none";
                    this._feedback6OpRow1.style.display = "none";
                    this._operatorRows[4].style.display = "none";
                    this._operatorRows[5].style.display = "none";
                    this._operatorDropdownGroups[4].style.display = "none";
                    this._operatorDropdownGroups[5].style.display = "none";
                    this._feedbackRow1.style.display = "";
                    this._algorithmSelectRow.style.display = "";
                }
            }
            else {
                this._algorithm6OpSelectRow.style.display = "none";
                this._feedback6OpRow1.style.display = "none";
                this._algorithmSelectRow.style.display = "none";
                this._phaseModGroup.style.display = "none";
                this._feedbackRow1.style.display = "none";
                this._feedbackRow2.style.display = "none";
            }

            if (instrument.type == InstrumentType.supersaw) {
                this._chipWaveSelectRow.style.display = "none";
				this._supersawDynamismRow.style.display = "";
				this._supersawSpreadRow.style.display = "";
				this._supersawShapeRow.style.display = "";
				this._supersawDynamismSlider.updateValue(instrument.supersawDynamism);
				this._supersawSpreadSlider.updateValue(instrument.supersawSpread);
				this._supersawShapeSlider.updateValue(instrument.supersawShape);
			} else {
				this._supersawDynamismRow.style.display = "none";
				this._supersawSpreadRow.style.display = "none";
				this._supersawShapeRow.style.display = "none";
			}
			if (instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.supersaw) {
				this._pulseWidthRow.style.display = "";
				this._pulseWidthSlider.input.title = prettyNumber(getPulseWidthRatio(instrument.pulseWidth) * 100) + "%";
				this._pulseWidthSlider.updateValue(instrument.pulseWidth);
			} else {
				this._pulseWidthRow.style.display = "none";
			}

            if (instrument.type == InstrumentType.wavetable) {
                this._chipWaveSelectRow.style.display = "none";
                this._wavetableSpeedRow.style.display = "";
                this._interpolateWavesRow.style.display = "";
                this._resetCyclePerNoteRow.style.display = "";
                if (instrument.cyclePerNote) {
                    this._oneShotCycleRow.style.display = "";
                } else {
                    this._oneShotCycleRow.style.display = "none";
                }
                this._wavetableCustomWaveDraw.style.display = "";
                this._wavetableWaveButtonsContainer.style.display = "grid";
                this._customWaveDraw.style.display = "none";
            } else if (instrument.type == InstrumentType.customChipWave) {
                this._chipWaveSelectRow.style.display = "none";
                this._customWaveDraw.style.display = "";
                this._wavetableSpeedRow.style.display = "none";
                this._interpolateWavesRow.style.display = "none";
                this._resetCyclePerNoteRow.style.display = "none";
                this._oneShotCycleRow.style.display = "none";
                this._wavetableCustomWaveDraw.style.display = "none";
                this._wavetableWaveButtonsContainer.style.display = "none";
            } else {
                this._wavetableSpeedRow.style.display = "none";
                this._interpolateWavesRow.style.display = "none";
                this._resetCyclePerNoteRow.style.display = "none";
                this._oneShotCycleRow.style.display = "none";
                this._wavetableCustomWaveDraw.style.display = "none";
                this._wavetableWaveButtonsContainer.style.display = "none";
                this._customWaveDraw.style.display = "none";
            }
            

            if (effectsIncludeTransition(instrument.effects)) {
                this._transitionRow.style.display = "";
                if (this._openTransitionDropdown)
                    this._transitionDropdownGroup.style.display = "";
                    this._slideSpeedRow.style.display = (instrument.transition == Config.transitions.dictionary["slide"].index) ? "" : "none";
                    this._continueThruPatternRow.style.display = (instrument.transition == Config.transitions.dictionary["normal"].index) ? "none" : "";
                setSelectedValue(this._transitionSelect, instrument.transition);
            } else {
                this._transitionDropdownGroup.style.display = "none";
                this._transitionRow.style.display = "none";
            }

            if (effectsIncludeChord(instrument.effects)) {
                this._chordSelectRow.style.display = "";
                this._chordDropdown.style.display = (instrument.chord == Config.chords.dictionary["arpeggio"].index) ? "" : "none";
                this._chordDropdown2.style.display = (Config.chords[instrument.chord].strumParts > 0) ? "" : "none";
                this._chordDropdownGroup.style.display = (instrument.chord == Config.chords.dictionary["arpeggio"].index && this._openChordDropdown) ? "" : "none";
                this._strumDropdownGroup.style.display = (Config.chords[instrument.chord].strumParts > 0 && this._openChordDropdown2) ? "" : "none";
                setSelectedValue(this._chordSelect, instrument.chord);
                setSelectedValue(this._arpeggioPatternSelect, instrument.arpeggioPattern);
            } else {
                this._chordSelectRow.style.display = "none";
                this._chordDropdown.style.display = "none";
                this._chordDropdown2.style.display = "none";
                this._chordDropdownGroup.style.display = "none";
                this._strumDropdownGroup.style.display = "none";
            }

            if (effectsIncludePitchShift(instrument.effects)) {
                this._pitchShiftRow.style.display = "";
                this._pitchShiftSlider.updateValue(instrument.pitchShift);
                this._pitchShiftSlider.input.title = (instrument.pitchShift - Config.pitchShiftCenter) + _.semitonesLabel;
                for (const marker of this._pitchShiftFifthMarkers) {
                    marker.style.display = prefs.showFifth ? "" : "none";
                }
            } else {
                this._pitchShiftRow.style.display = "none";
            }

            if (effectsIncludeDetune(instrument.effects)) {
                this._detuneSliderRow.style.display = "";
                this._detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
                this._detuneSlider.input.title = (Synth.detuneToCents(instrument.detune)) + _.centsLabel;
            } else {
                this._detuneSliderRow.style.display = "none";
            }

            if (effectsIncludeVibrato(instrument.effects)) {
                this._vibratoSelectRow.style.display = "";
                if (this._openVibratoDropdown)
                    this._vibratoDropdownGroup.style.display = "";
                setSelectedValue(this._vibratoSelect, instrument.vibrato);
            } else {
                this._vibratoDropdownGroup.style.display = "none";
                this._vibratoSelectRow.style.display = "none";
            }

            if (effectsIncludeNoteFilter(instrument.effects)) {

                this._noteFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
                this._noteFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
                this._noteFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
                this._noteFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);
                this._noteFilterTypeRow.style.display = "";

                if (this._doc.synth.isFilterModActive(true, this._doc.channel, this._doc.getCurrentInstrument())) {
                    this._noteFilterEditor.render(true, this._ctrlHeld || this._shiftHeld);
                }
                else {
                    this._noteFilterEditor.render();
                }

                if (instrument.noteFilterType) {
                    this._noteFilterSimpleButton.classList.remove("deactivated");
                    this._noteFilterAdvancedButton.classList.add("deactivated");
                    this._noteFilterRow.style.display = "none";
                    this._noteFilterSimpleCutRow.style.display = "";
                    this._noteFilterSimplePeakRow.style.display = "";
                } else {
                    this._noteFilterSimpleButton.classList.add("deactivated");
                    this._noteFilterAdvancedButton.classList.remove("deactivated");
                    this._noteFilterRow.style.display = "";
                    this._noteFilterSimpleCutRow.style.display = "none";
                    this._noteFilterSimplePeakRow.style.display = "none";
                }
            } else {
                this._noteFilterRow.style.display = "none";
                this._noteFilterSimpleCutRow.style.display = "none";
                this._noteFilterSimplePeakRow.style.display = "none";
                this._noteFilterTypeRow.style.display = "none";
            }

            if (effectsIncludeDistortion(instrument.effects)) {
                this._distortionRow.style.display = "";
                if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave || instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.wavetable || instrument.type == InstrumentType.supersaw)
                    this._aliasingRow.style.display = "";
                else
                    this._aliasingRow.style.display = "none";
                this._distortionSlider.updateValue(instrument.distortion);
            } else {
                this._distortionRow.style.display = "none";
                this._aliasingRow.style.display = "none";
            }

            if (effectsIncludeBitcrusher(instrument.effects)) {
                this._bitcrusherQuantizationRow.style.display = "";
                this._bitcrusherFreqRow.style.display = "";
                this._bitcrusherQuantizationSlider.updateValue(instrument.bitcrusherQuantization);
                this._bitcrusherFreqSlider.updateValue(instrument.bitcrusherFreq);
            } else {
                this._bitcrusherQuantizationRow.style.display = "none";
                this._bitcrusherFreqRow.style.display = "none";
            }

            if (effectsIncludeWavefold(instrument.effects)) {
                this._wavefoldLowerRow.style.display = "";
                this._wavefoldUpperRow.style.display = "";
            } else {
                this._wavefoldLowerRow.style.display = "none";
                this._wavefoldUpperRow.style.display = "none";
            }

            if (effectsIncludePanning(instrument.effects)) {
                this._panSliderRow.style.display = "";
                if (this._openPanDropdown)
                    this._panDropdownGroup.style.display = "";
                this._panSlider.updateValue(instrument.pan);
            } else {
                this._panSliderRow.style.display = "none";
                this._panDropdownGroup.style.display = "none";
            }

            if (effectsIncludeChorus(instrument.effects)) {
                this._chorusRow.style.display = "";
                this._chorusSlider.updateValue(instrument.chorus);
            } else {
                this._chorusRow.style.display = "none";
            }

            if (effectsIncludeEcho(instrument.effects)) {
                this._echoSustainRow.style.display = "";
                this._echoSustainSlider.updateValue(instrument.echoSustain);
                this._echoDelayRow.style.display = "";
                this._echoDelaySlider.updateValue(instrument.echoDelay);
                this._echoDelaySlider.input.title = (Math.round((instrument.echoDelay + 1) * Config.echoDelayStepTicks / (Config.ticksPerPart * Config.partsPerBeat) * 1000) / 1000) + _.beatsLabel;
            } else {
                this._echoSustainRow.style.display = "none";
                this._echoDelayRow.style.display = "none";
            }

            if (effectsIncludeReverb(instrument.effects)) {
                this._reverbRow.style.display = "";
                this._reverbSlider.updateValue(instrument.reverb);
            } else {
                this._reverbRow.style.display = "none";
            }

            if (effectsIncludePercussion(instrument.effects)) {
                this._percussionRow.style.display = "";
                this._songDetuneEffectedRow.style.display = "";
                this._songOctaveEffectedRow.style.display = "";
            } else {
                this._percussionRow.style.display = "none";
                this._songDetuneEffectedRow.style.display = "none";
                this._songOctaveEffectedRow.style.display = "none";
            }

            if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave || instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString || instrument.type == InstrumentType.spectrum || instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.wavetable || instrument.type == InstrumentType.noise) {
                this._unisonSelectRow.style.display = "";
                setSelectedValue(this._unisonSelect, instrument.unison);
                this._unisonVoicesInputBox.value = instrument.unisonVoices + "";
                this._unisonSpreadInputBox.value = instrument.unisonSpread + "";
                this._unisonOffsetInputBox.value = instrument.unisonOffset + "";
                this._unisonExpressionInputBox.value = instrument.unisonExpression + "";
                this._unisonSignInputBox.value = instrument.unisonSign + "";
                this._unisonDropdownGroup.style.display = (this._openUnisonDropdown ? "" : "none");
            } else {
                this._unisonSelectRow.style.display = "none";
                this._unisonDropdownGroup.style.display = "none";
            }

            if (this._openEnvelopeDropdown) this._envelopeDropdownGroup.style.display = "";
            else this._envelopeDropdownGroup.style.display = "none";
            this._envelopeEditor.render();

            for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
                let hidden: boolean = (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[chordIndex].customInterval);
                const option: Element = this._chordSelect.children[chordIndex];
                if (hidden) {
                    if (!option.hasAttribute("hidden")) {
                        option.setAttribute("hidden", "");
                    }
                } else {
                    option.removeAttribute("hidden");
                }
            }

            this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

            setSelectedValue(this._transitionSelect, instrument.transition);
            setSelectedValue(this._vibratoSelect, instrument.vibrato);
            setSelectedValue(this._vibratoTypeSelect, instrument.vibratoType);
            setSelectedValue(this._chordSelect, instrument.chord);
            this._panSliderInputBox.value = instrument.pan + "";
            this._pwmSliderInputBox.value = instrument.pulseWidth + "";
            this._detuneSliderInputBox.value = (instrument.detune - Config.detuneCenter) + "";
            this._instrumentVolumeSlider.updateValue(instrument.volume);
            this._instrumentVolumeSliderInputBox.value = "" + (instrument.volume);
            this._vibratoDepthSlider.updateValue(Math.round(instrument.vibratoDepth * 25));
            this._vibratoDelaySlider.updateValue(Math.round(instrument.vibratoDelay));
            this._vibratoSpeedSlider.updateValue(instrument.vibratoSpeed);
            setSelectedValue(this._vibratoTypeSelect, instrument.vibratoType);
            this._arpeggioSpeedSlider.updateValue(instrument.arpeggioSpeed);
            this._strumSpeedSlider.updateValue(instrument.strumSpeed);
            this._slideSpeedSlider.updateValue(instrument.slideSpeed);
            this._wavetableSpeedSlider.updateValue(instrument.wavetableSpeed);
            this._panDelaySlider.updateValue(instrument.panDelay);
            this._vibratoDelaySlider.input.title = "" + Math.round(instrument.vibratoDelay);
            this._vibratoDepthSlider.input.title = "" + instrument.vibratoDepth;
            this._vibratoSpeedSlider.input.title = "x" + instrument.vibratoSpeed / 10;
            this._vibratoSpeedDisplay.textContent = "x" + instrument.vibratoSpeed / 10;
            this._panDelaySlider.input.title = "" + instrument.panDelay;
            this._arpeggioSpeedSlider.input.title = "x" + prettyNumber(Config.arpSpeedScale[instrument.arpeggioSpeed]);
            this._arpeggioSpeedDisplay.textContent = "x" + prettyNumber(Config.arpSpeedScale[instrument.arpeggioSpeed]);
            if (this._arpeggioPatternSelect.selectedIndex == 0) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern1Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 1) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern2Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 2) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern3Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 3) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern4Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 4) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern5Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 5) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern6Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 6) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern7Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 7) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern8Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 8) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern9Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 9) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern10Label;
            else if (this._arpeggioPatternSelect.selectedIndex == 10) this._arpeggioPatternSelectedText.textContent = _.arpeggioPattern11Label;
            else throw new Error("There is no label for the arpeggio pattern type selected.");
            this._strumSpeedSlider.input.title = prettyNumber((Config.strumSpeedScale[instrument.strumSpeed]) * -1 + 24);
            this._strumSpeedDisplay.textContent = prettyNumber((Config.strumSpeedScale[instrument.strumSpeed]) * 2) + " tk";
            this._slideSpeedSlider.input.title = prettyNumber((Config.slideSpeedScale[instrument.slideSpeed]) * -1 + 24);
            this._slideSpeedDisplay.textContent = prettyNumber((Config.slideSpeedScale[instrument.slideSpeed]) * 2) + " tk";
            this._wavetableSpeedSlider.input.title = prettyNumber(Config.wavetableSpeedScale[instrument.wavetableSpeed]);
            this._wavetableSpeedDisplay.textContent = prettyNumber(Config.wavetableSpeedScale[instrument.wavetableSpeed]) + "wpb";
            this._eqFilterSimpleCutSlider.updateValue(instrument.eqFilterSimpleCut);
            this._eqFilterSimplePeakSlider.updateValue(instrument.eqFilterSimplePeak);
            this._noteFilterSimpleCutSlider.updateValue(instrument.noteFilterSimpleCut);
            this._noteFilterSimplePeakSlider.updateValue(instrument.noteFilterSimplePeak);
            this._envelopeSpeedSlider.updateValue(instrument.envelopeSpeed);
            this._envelopeSpeedSlider.input.title = "x" + prettyNumber(Config.arpSpeedScale[instrument.envelopeSpeed]);
            this._envelopeSpeedDisplay.textContent = "x" + prettyNumber(Config.arpSpeedScale[instrument.envelopeSpeed]);

            if (instrument.type == InstrumentType.customChipWave) {
                this._customWaveDrawCanvas.redrawCanvas();
                if (this.prompt instanceof CustomChipPrompt) {
                    this.prompt.customChipCanvas.render();
                }
            }

            if (instrument.type == InstrumentType.wavetable) {
                this._wavetableCustomWaveDrawCanvas.index = this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()];
                this._wavetableCustomWaveDrawCanvas.redrawCanvas();
                if (this.prompt instanceof WavetablePrompt) {
                    this.prompt.wavetableCanvas.render();
                }

                this._renderWavetableWaveButtons(this._doc.song.channels[this._doc.channel], ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
            }

            this._renderInstrumentBar(channel, instrumentIndex, colors);
        }
        // Options for mod channel
        else {
            this._usageCheck(this._doc.channel, instrumentIndex);

            this._pitchedPresetSelect.style.display = "none";
            this._drumPresetSelect.style.display = "none";
            $("#pitchPresetSelect").parent().hide();
            $("#drumPresetSelect").parent().hide();
            this._modulatorGroup.appendChild(this._instrumentCopyGroup);

            this._modulatorGroup.insertBefore(this._instrumentsButtonRow, this._modulatorGroup.firstChild);
            this._modulatorGroup.insertBefore(this._instrumentSettingsTextRow, this._modulatorGroup.firstChild);
            if (this._doc.song.channels[this._doc.channel].name == "") {
                this._instrumentSettingsTextRow.textContent = _.modSettingsLabel;
            }
            else {
                this._instrumentSettingsTextRow.textContent = this._doc.song.channels[this._doc.channel].name;
            }

            this._chipNoiseSelectRow.style.display = "none";
            this._chipWaveSelectRow.style.display = "none";
            //this._isNoiseSeedRandomizedRow.style.display = "none";
            this._spectrumRow.style.display = "none";
            this._harmonicsRow.style.display = "none";
            //this._harmonicsCopyPasteRow.style.display = "none";
            this._transitionRow.style.display = "none";
            this._chordSelectRow.style.display = "none";
            this._chordDropdownGroup.style.display = "none";
            this._strumDropdownGroup.style.display = "none";
            //this._filterCutoffRow.style.display = "none";
            //this._filterResonanceRow.style.display = "none";
            //this._filterEnvelopeRow.style.display = "none";
            this._drumsetGroup.style.display = "none";
            this._customWaveDraw.style.display = "none";
            this._supersawDynamismRow.style.display = "none";
			this._supersawSpreadRow.style.display = "none";
			this._supersawShapeRow.style.display = "none";
            this._algorithmSelectRow.style.display = "none";
            this._phaseModGroup.style.display = "none";
            this._feedbackRow1.style.display = "none";
            this._feedbackRow2.style.display = "none";
            //this._pulseEnvelopeRow.style.display = "none";
            this._pulseWidthRow.style.display = "none";
            this._vibratoSelectRow.style.display = "none";
            this._vibratoDropdownGroup.style.display = "none";
            this._envelopeDropdownGroup.style.display = "none";
            //this._intervalSelectRow.style.display = "none";
            this._detuneSliderRow.style.display = "none";
            this._panSliderRow.style.display = "none";
            this._panDropdownGroup.style.display = "none";
            this._unisonDropdownGroup.style.display = "none";

            this._modulatorGroup.style.display = "";
            this._modulatorGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

            for (let mod: number = 0; mod < Config.modCount; mod++) {

                let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                let modChannel: number = Math.max(0, instrument.modChannels[mod]);
                let modInstrument: number = instrument.modInstruments[mod];

                // Boundary checking
                if (modInstrument >= this._doc.song.channels[modChannel].instruments.length + 2 || (modInstrument > 0 && this._doc.song.channels[modChannel].instruments.length <= 1)) {
                    modInstrument = 0;
                    instrument.modInstruments[mod] = 0;
                }
                if (modChannel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                    instrument.modInstruments[mod] = 0;
                    instrument.modulators[mod] = 0;
                }

                // Build options for modulator channels (make sure it has the right number).
                if (this._doc.recalcChannelNames || (this._modChannelBoxes[mod].children.length != 2 + this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
                    while (this._modChannelBoxes[mod].firstChild) this._modChannelBoxes[mod].remove(0);
                    const channelList: string[] = [];
                    channelList.push(_.modOptions1Label);
                    channelList.push(_.modOptions2Label);
                    for (let i: number = 0; i < this._doc.song.pitchChannelCount; i++) {
                        if (this._doc.song.channels[i].name == "") {
                            channelList.push(_.modOptions3Label + (i + 1));
                        }
                        else {
                            channelList.push(this._doc.song.channels[i].name);
                        }
                    }
                    for (let i: number = 0; i < this._doc.song.noiseChannelCount; i++) {
                        if (this._doc.song.channels[i + this._doc.song.pitchChannelCount].name == "") {
                            channelList.push(_.modOptions4Label + (i + 1));
                        }
                        else {
                            channelList.push(this._doc.song.channels[i + this._doc.song.pitchChannelCount].name);
                        }
                    }
                    buildOptions(this._modChannelBoxes[mod], channelList);
                }

                // Set selected index based on channel info.

                this._modChannelBoxes[mod].selectedIndex = instrument.modChannels[mod] + 2; // Offset to get to first pitch channel

                let channel: Channel = this._doc.song.channels[modChannel];

                // Build options for modulator instruments (make sure it has the right number).
                if (this._modInstrumentBoxes[mod].children.length != channel.instruments.length + 2) {
                    while (this._modInstrumentBoxes[mod].firstChild) this._modInstrumentBoxes[mod].remove(0);
                    const instrumentList: string[] = [];
                    for (let i: number = 0; i < channel.instruments.length; i++) {
                        instrumentList.push("" + i + 1);
                    }
                    instrumentList.push(_.modOptions5Label);
                    instrumentList.push(_.modOptions6Label);
                    buildOptions(this._modInstrumentBoxes[mod], instrumentList);
                }

                // If non-zero pattern, point to which instrument(s) is/are the current
                if (channel.bars[this._doc.bar] > 0) {

                    let usedInstruments: number[] = channel.patterns[channel.bars[this._doc.bar] - 1].instruments;

                    for (let i: number = 0; i < channel.instruments.length; i++) {

                        if (usedInstruments.includes(i)) {
                            this._modInstrumentBoxes[mod].options[i].label = "🢒" + (i + 1);
                        }
                        else {
                            this._modInstrumentBoxes[mod].options[i].label = "" + (i + 1);
                        }
                    }
                }
                else {
                    for (let i: number = 0; i < channel.instruments.length; i++) {
                        this._modInstrumentBoxes[mod].options[i].label = "" + (i + 1);
                    }
                }

                // Set selected index based on instrument info.
                this._modInstrumentBoxes[mod].selectedIndex = instrument.modInstruments[mod];

                // Build options for modulator settings (based on channel settings)

                if (instrument.modChannels[mod] != -2) {
                    while (this._modSetBoxes[mod].firstChild) this._modSetBoxes[mod].remove(0);
                    const settingList: string[] = [];
                    const unusedSettingList: string[] = [];

                    // Make sure these names match the names declared for modulators in SynthConfig.ts.

                    settingList.push("none");

                    // Populate mod setting options for the song scope.
                    if (instrument.modChannels[mod] == -1) {
                        settingList.push("song volume");
                        settingList.push("tempo");
                        settingList.push("song reverb");
                        settingList.push("next bar");
                        settingList.push("song detune");
                    }
                    // Populate mod setting options for instrument scope.
                    else {

                        settingList.push("note volume");
                        settingList.push("mix volume");

                        // Build a list of target instrument indices, types and other info. It will be a single type for a single instrument, but with "all" and "active" it could be more.
                        // All or active are included together. Active allows any to be set, just in case the user fiddles with which are active later.
                        let tgtInstrumentTypes: InstrumentType[] = [];
                        let anyInstrumentAdvancedEQ:     boolean = false,
                            anyInstrumentSimpleEQ:       boolean = false,
                            anyInstrumentAdvancedNote:   boolean = false,
                            anyInstrumentSimpleNote:     boolean = false,
                            anyInstrumentArps:           boolean = false,
                            anyInstrumentPitchShifts:    boolean = false,
                            anyInstrumentDetunes:        boolean = false,
                            anyInstrumentVibratos:       boolean = false,
                            anyInstrumentNoteFilters:    boolean = false,
                            anyInstrumentDistorts:       boolean = false,
                            anyInstrumentBitcrushes:     boolean = false,
                            anyInstrumentPans:           boolean = false,
                            anyInstrumentChorus:         boolean = false,
                            anyInstrumentEchoes:         boolean = false,
                            anyInstrumentReverbs:        boolean = false,
                            anyInstrumentHasEnvelopes:   boolean = false;
                        let allInstrumentPitchShifts:    boolean = true,
                            allInstrumentNoteFilters:    boolean = true,
                            allInstrumentDetunes:        boolean = true,
                            allInstrumentVibratos:       boolean = true,
                            allInstrumentDistorts:       boolean = true,
                            allInstrumentBitcrushes:     boolean = true,
                            allInstrumentPans:           boolean = true,
                            allInstrumentChorus:         boolean = true,
                            allInstrumentEchoes:         boolean = true,
                            allInstrumentReverbs:        boolean = true;
                        let instrumentCandidates: number[] = [];
                        if (modInstrument >= channel.instruments.length) {
                            for (let i: number = 0; i < channel.instruments.length; i++) {
                                instrumentCandidates.push(i);
                            }
                        } else {
                            instrumentCandidates.push(modInstrument);
                        }
                        for (let i: number = 0; i < instrumentCandidates.length; i++) {
                            let instrumentIndex = instrumentCandidates[i];

                            if (!tgtInstrumentTypes.includes(channel.instruments[instrumentIndex].type))
                                tgtInstrumentTypes.push(channel.instruments[instrumentIndex].type);
                            if (channel.instruments[instrumentIndex].eqFilterType)
                                anyInstrumentSimpleEQ = true;
                            else
                                anyInstrumentAdvancedEQ = true;
                            if (effectsIncludeChord(channel.instruments[instrumentIndex].effects) && channel.instruments[instrumentIndex].getChord().arpeggiates) {
                                anyInstrumentArps = true;
                            }
                            if (effectsIncludePitchShift(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentPitchShifts = true;
                            }
                            if (effectsIncludeDetune(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentDetunes = true;
                            }
                            else {
                                allInstrumentDetunes = false;
                            }
                            if (effectsIncludeVibrato(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentVibratos = true;
                            }
                            else {
                                allInstrumentVibratos = false;
                            }
                            if (effectsIncludeNoteFilter(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentNoteFilters = true;
                                if (channel.instruments[instrumentIndex].noteFilterType)
                                    anyInstrumentSimpleNote = true;
                                else
                                    anyInstrumentAdvancedNote = true;
                            }
                            else {
                                allInstrumentNoteFilters = false;
                            }
                            if (effectsIncludeDistortion(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentDistorts = true;
                            }
                            else {
                                allInstrumentDistorts = false;
                            }
                            if (effectsIncludeBitcrusher(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentBitcrushes = true;
                            }
                            else {
                                allInstrumentBitcrushes = false;
                            }
                            if (effectsIncludePanning(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentPans = true;
                            }
                            else {
                                allInstrumentPans = false;
                            }
                            if (effectsIncludeChorus(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentChorus = true;
                            }
                            else {
                                allInstrumentChorus = false;
                            }
                            if (effectsIncludeEcho(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentEchoes = true;
                            }
                            else {
                                allInstrumentEchoes = false;
                            }
                            if (effectsIncludeReverb(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentReverbs = true;
                            }
                            else {
                                allInstrumentReverbs = false;
                            }
                            if (channel.instruments[instrumentIndex].envelopes.length > 0) {
                                anyInstrumentHasEnvelopes = true;
                            }

                        }
                        if (anyInstrumentAdvancedEQ) {
                            settingList.push("eq filter");
                        }
                        if (anyInstrumentSimpleEQ) {
                            settingList.push("eq filt cut");
                            settingList.push("eq filt peak");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.fm)) {
                            settingList.push("fm slider 1");
                            settingList.push("fm slider 2");
                            settingList.push("fm slider 3");
                            settingList.push("fm slider 4");
                            settingList.push("fm feedback");
                            settingList.push("fm pwm 1");
                            settingList.push("fm pwm 2");
                            settingList.push("fm pwm 3");
                            settingList.push("fm pwm 4");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.advfm)) {
                            settingList.push("fm slider 1");
                            settingList.push("fm slider 2");
                            settingList.push("fm slider 3");
                            settingList.push("fm slider 4");
                            settingList.push("fm slider 5");
                            settingList.push("fm slider 6");
                            settingList.push("fm feedback");
                            settingList.push("fm pwm 1");
                            settingList.push("fm pwm 2");
                            settingList.push("fm pwm 3");
                            settingList.push("fm pwm 4");
                            settingList.push("fm pwm 5");
                            settingList.push("fm pwm 6");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.pwm)) {
                            settingList.push("pulse width");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.pickedString)) {
                            settingList.push("sustain");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.supersaw)) {
                            settingList.push("pulse width");
                            settingList.push("dynamism");
                            settingList.push("spread");
                            settingList.push("shape");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.wavetable)) {
                            settingList.push("cycle wave");
                            settingList.push("wavetable speed")
                        }
                        if (anyInstrumentArps) {
                            settingList.push("arp speed");
                            settingList.push("reset arp");
                        }
                        if (anyInstrumentPitchShifts) {
                            settingList.push("pitch shift");
                        }
                        if (!allInstrumentPitchShifts) {
                            unusedSettingList.push("+ pitch shift");
                        }
                        if (anyInstrumentDetunes) {
                            settingList.push("detune");
                        }
                        if (!allInstrumentDetunes) {
                            unusedSettingList.push("+ detune");
                        }
                        if (anyInstrumentVibratos) {
                            settingList.push("vibrato depth");
                            settingList.push("vibrato speed");
                            settingList.push("vibrato delay");
                        }
                        if (!allInstrumentVibratos) {
                            unusedSettingList.push("+ vibrato depth");
                            unusedSettingList.push("+ vibrato speed");
                            unusedSettingList.push("+ vibrato delay");
                        }
                        if (anyInstrumentNoteFilters) {
                            if (anyInstrumentAdvancedNote) {
                                settingList.push("note filter");
                            }
                            if (anyInstrumentSimpleNote) {
                                settingList.push("note filt cut");
                                settingList.push("note filt peak");
                            }
                        }
                        if (!allInstrumentNoteFilters) {
                            unusedSettingList.push("+ note filter");
                        }
                        if (anyInstrumentDistorts) {
                            settingList.push("distortion");
                        }
                        if (!allInstrumentDistorts) {
                            unusedSettingList.push("+ distortion");
                        }
                        if (anyInstrumentBitcrushes) {
                            settingList.push("bit crush");
                            settingList.push("freq crush");
                        }
                        if (!allInstrumentBitcrushes) {
                            unusedSettingList.push("+ bit crush");
                            unusedSettingList.push("+ freq crush");
                        }
                        if (anyInstrumentPans) {
                            settingList.push("pan");
                            settingList.push("pan delay");
                        }
                        if (!allInstrumentPans) {
                            unusedSettingList.push("+ pan");
                            unusedSettingList.push("+ pan delay");
                        }
                        if (anyInstrumentChorus) {
                            settingList.push("chorus");
                        }
                        if (!allInstrumentChorus) {
                            unusedSettingList.push("+ chorus");
                        }
                        if (anyInstrumentEchoes) {
                            settingList.push("echo");
                            // Disabled currently!
                            //settingList.push("echo delay");
                        }
                        if (!allInstrumentEchoes) {
                            unusedSettingList.push("+ echo");
                            //unusedSettingList.push("echo delay");
                        }
                        if (anyInstrumentReverbs) {
                            settingList.push("reverb");
                        }
                        if (!allInstrumentReverbs) {
                            unusedSettingList.push("+ reverb");
                        }

                        if (anyInstrumentHasEnvelopes) {
                            settingList.push("envelope speed");
                        }

                    }

                    buildOptions(this._modSetBoxes[mod], settingList);
                    if (unusedSettingList.length > 0) {
                        this._modSetBoxes[mod].appendChild(option({ selected: false, disabled: true, value: "Add Effect" }, "Add Effect"));
                        buildOptions(this._modSetBoxes[mod], unusedSettingList);
                    }

                    let setIndex: number = settingList.indexOf(Config.modulators[instrument.modulators[mod]].name);

                    // Catch instances where invalid set forced setting to "none"
                    if (setIndex == -1) {
                        this._modSetBoxes[mod].insertBefore(option({ value: Config.modulators[instrument.modulators[mod]].name, style: "color: red;" }, Config.modulators[instrument.modulators[mod]].name), this._modSetBoxes[mod].children[0]);
                        this._modSetBoxes[mod].selectedIndex = 0;
                        this._whenSetModSetting(mod, true);
                    }
                    else {
                        this._modSetBoxes[mod].selectedIndex = setIndex;
                        this._modSetBoxes[mod].classList.remove("invalidSetting");
                        instrument.invalidModulators[mod] = false;
                    }

                } else if (this._modSetBoxes[mod].selectedIndex > 0) {
                    this._modSetBoxes[mod].selectedIndex = 0;
                    this._whenSetModSetting(mod);
                }

                //Hide instrument select if channel is "none" or "song"
                if (instrument.modChannels[mod] < 0) {
                    ((this._modInstrumentBoxes[mod].parentElement) as HTMLDivElement).style.display = "none";
                    $("#modInstrumentText" + mod).get(0).style.display = "none";
                    $("#modChannelText" + mod).get(0).innerText = "Channel:";

                    //Hide setting select if channel is "none"
                    if (instrument.modChannels[mod] == -2) {
                        $("#modSettingText" + mod).get(0).style.display = "none";
                        ((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "none";
                    }
                    else {
                        $("#modSettingText" + mod).get(0).style.display = "";
                        ((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "";
                    }

                    this._modTargetIndicators[mod].style.setProperty("fill", ColorConfig.uiWidgetFocus);
                    this._modTargetIndicators[mod].classList.remove("modTarget");

                }
                else {
                    ((this._modInstrumentBoxes[mod].parentElement) as HTMLDivElement).style.display = (channel.instruments.length > 1) ? "" : "none";
                    $("#modInstrumentText" + mod).get(0).style.display = (channel.instruments.length > 1) ? "" : "none";
                    $("#modChannelText" + mod).get(0).innerText = (channel.instruments.length > 1) ? "Ch:" : "Channel:";
                    $("#modSettingText" + mod).get(0).style.display = "";
                    ((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "";

                    this._modTargetIndicators[mod].style.setProperty("fill", ColorConfig.indicatorPrimary);
                    this._modTargetIndicators[mod].classList.add("modTarget");
                }

                let filterType: string = Config.modulators[instrument.modulators[mod]].name;
                if (filterType == "eq filter" || filterType == "note filter") {
                    $("#modFilterText" + mod).get(0).style.display = "";
                    $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "2px");

                    let useInstrument: number = instrument.modInstruments[mod];
                    let modChannel: Channel = this._doc.song.channels[Math.max(0, instrument.modChannels[mod])];
                    let tmpCount: number = -1;
                    if (useInstrument >= modChannel.instruments.length) {
                        // Use greatest number of dots among all instruments if setting is 'all' or 'active'. If it won't have an effect on one, no worry.
                        for (let i: number = 0; i < modChannel.instruments.length; i++) {
                            if (filterType == "eq filter") {
                                if (modChannel.instruments[i].eqFilter.controlPointCount > tmpCount) {
                                    tmpCount = modChannel.instruments[i].eqFilter.controlPointCount;
                                    useInstrument = i;
                                }
                            } else {
                                if (modChannel.instruments[i].noteFilter.controlPointCount > tmpCount) {
                                    tmpCount = modChannel.instruments[i].noteFilter.controlPointCount;
                                    useInstrument = i;
                                }
                            }
                        }
                    }

                    // Build options for modulator filters (make sure it has the right number of filter dots).
                    let dotCount: number = (filterType == "eq filter")
                        ? channel.instruments[useInstrument].getLargestControlPointCount(false)
                        : channel.instruments[useInstrument].getLargestControlPointCount(true);

                    const isSimple: boolean = (filterType == "eq filter" ? channel.instruments[useInstrument].eqFilterType : channel.instruments[useInstrument].noteFilterType);
                    if (isSimple)
                        dotCount = 0;

                    if (isSimple || this._modFilterBoxes[mod].children.length != 1 + dotCount * 2) {
                        while (this._modFilterBoxes[mod].firstChild) this._modFilterBoxes[mod].remove(0);
                        const dotList: string[] = [];
                        if (!isSimple)
                            dotList.push("morph");
                        for (let i: number = 0; i < dotCount; i++) {
                            dotList.push("dot " + (i + 1) + " x");
                            dotList.push("dot " + (i + 1) + " y");
                        }
                        buildOptions(this._modFilterBoxes[mod], dotList);
                    }

                    if (isSimple || instrument.modFilterTypes[mod] >= this._modFilterBoxes[mod].length) {
                        this._modFilterBoxes[mod].classList.add("invalidSetting");
                        instrument.invalidModulators[mod] = true;
                        let useName: string = ((instrument.modFilterTypes[mod] - 1) % 2 == 1) ?
                            "dot " + (Math.floor((instrument.modFilterTypes[mod] - 1) / 2) + 1) + " y"
                            : "dot " + (Math.floor((instrument.modFilterTypes[mod] - 1) / 2) + 1) + " x";
                        if (instrument.modFilterTypes[mod] == 0)
                            useName = "morph";
                        this._modFilterBoxes[mod].insertBefore(option({ value: useName, style: "color: red;" }, useName), this._modFilterBoxes[mod].children[0]);
                        this._modFilterBoxes[mod].selectedIndex = 0;

                    }
                    else {
                        this._modFilterBoxes[mod].classList.remove("invalidSetting");
                        instrument.invalidModulators[mod] = false;
                        this._modFilterBoxes[mod].selectedIndex = instrument.modFilterTypes[mod];
                    }



                } else {
                    $("#modFilterText" + mod).get(0).style.display = "none";
                    $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "0.9em");

                }
            }

            this._doc.recalcChannelNames = false;

            for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
                const option: Element = this._chordSelect.children[chordIndex];
                if (!option.hasAttribute("hidden")) {
                    option.setAttribute("hidden", "");
                }

            }

            //this._instrumentSelectRow.style.display = "none";

            this._customInstrumentSettingsGroup.style.display = "none";
            this._panSliderRow.style.display = "none";
            this._panDropdownGroup.style.display = "none";
            this._instrumentVolumeSliderRow.style.display = "none";
            this._instrumentTypeSelectRow.style.setProperty("display", "none");

            this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

            // Force piano to re-show, if channel is modulator
            if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                this._piano.forceRender();
            }

            this._renderInstrumentBar(channel, instrumentIndex, colors);

        }

        this._instrumentSettingsGroup.style.color = colors.primaryNote;

        if (this._doc.synth.isFilterModActive(false, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._eqFilterEditor.render(true, this._ctrlHeld || this._shiftHeld);
        }
        else {
            this._eqFilterEditor.render();
        }
        this._instrumentVolumeSlider.updateValue(instrument.volume);
        this._detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
        this._interpolateWavesBox.checked = instrument.interpolateWaves ? true : false;
        this._resetCyclePerNoteBox.checked = instrument.cyclePerNote ? true : false;
        this._oneShotCycleBox.checked = instrument.oneShotCycle ? true : false;
        //this._isNoiseSeedRandomizedBox.checked = instrument.noiseSeedRandomization ? true : false;
        this._twoNoteArpBox.checked = instrument.fastTwoNoteArp ? true : false;
        this._clicklessTransitionBox.checked = instrument.clicklessTransition ? true : false;
        this._continueThruPatternBox.checked = instrument.continueThruPattern ? true : false;
        this._aliasingBox.checked = instrument.aliases ? true : false;
        this._percussionBox.checked = instrument.percussion ? true : false;
        this._songDetuneEffectedBox.checked = instrument.songDetuneEffected ? true : false;
        this._addEnvelopeButton.disabled = (instrument.envelopeCount >= Config.maxEnvelopeCount);

        this._volumeSlider.updateValue(prefs.volume);
        this._oscilloscopeScaleSlider.updateValue(prefs.oscilloscopeScale);

        // If an interface element was selected, but becomes invisible (e.g. an instrument
        // select menu) just select the editor container so keyboard commands still work.
        if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
            this.refocusStage();
        }

        this._setPrompt(this._doc.prompt);

        if (prefs.autoFollow && !this._doc.synth.playing) {
            this._doc.synth.goToBar(this._doc.bar);
        }

        // When adding effects or envelopes to an instrument in fullscreen modes,
        // auto-scroll the settings areas to ensure the new settings are visible.
        if (this._doc.addedEffect) {
            const envButtonRect: DOMRect = this._addEnvelopeButton.getBoundingClientRect();
            const instSettingsRect: DOMRect = this._instrumentSettingsArea.getBoundingClientRect();
            const settingsRect: DOMRect = this._settingsArea.getBoundingClientRect();
            this._instrumentSettingsArea.scrollTop += Math.max(0, envButtonRect.top - (instSettingsRect.top + instSettingsRect.height));
            this._settingsArea.scrollTop += Math.max(0, envButtonRect.top - (settingsRect.top + settingsRect.height));
            this._doc.addedEffect = false;
        }
        if (this._doc.addedEnvelope) {
            this._instrumentSettingsArea.scrollTop = this._instrumentSettingsArea.scrollHeight;
            this._settingsArea.scrollTop = this._settingsArea.scrollHeight;
            this._doc.addedEnvelope = false;
        }

        // Writeback to mods if control key is held while moving a slider.
        this.handleModRecording();

    }

    public handleModRecording(): void {
        window.clearTimeout(this._modRecTimeout);
        const lastChange: Change | null = this._doc.checkLastChange();
        if ((this._ctrlHeld || this._shiftHeld) && lastChange != null && this._doc.synth.playing) {
            const changedPatterns = this._patternEditor.setModSettingsForChange(lastChange, this);
            if (this._doc.continuingModRecordingChange != null) {
                this._modRecTimeout = window.setTimeout(() => { this.handleModRecording(); }, 10);
                this._doc.recordingModulators = true;

                if (changedPatterns)
                    this._trackEditor.render();
            }
        }
        else if (this._doc.recordingModulators) {
            this._doc.recordingModulators = false;
            // A dummy change that pushes history state.
            this._doc.record(new ChangeHoldingModRecording(this._doc, null, null, null));
        }
    }

    private _renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ChannelColors) {
        if (this._doc.song.layeredInstruments || this._doc.song.patternInstruments) {
            this._instrumentsButtonRow.style.display = "";
            this._instrumentsButtonBar.style.setProperty("--text-color-lit", colors.primaryNote);
            this._instrumentsButtonBar.style.setProperty("--text-color-dim", colors.secondaryNote);
            this._instrumentsButtonBar.style.setProperty("--background-color-lit", colors.primaryChannel);
            this._instrumentsButtonBar.style.setProperty("--background-color-dim", colors.secondaryChannel);

            const maxInstrumentsPerChannel = this._doc.song.getMaxInstrumentsPerChannel();
            while (this._instrumentButtons.length < channel.instruments.length) {
                const instrumentButton: HTMLButtonElement = button(String(this._instrumentButtons.length + 1));
                this._instrumentButtons.push(instrumentButton);
                this._instrumentsButtonBar.insertBefore(instrumentButton, this._instrumentRemoveButton);
            }
            for (let i: number = this._renderedInstrumentCount; i < channel.instruments.length; i++) {
                this._instrumentButtons[i].style.display = "";
            }
            for (let i: number = channel.instruments.length; i < this._renderedInstrumentCount; i++) {
                this._instrumentButtons[i].style.display = "none";
            }
            this._renderedInstrumentCount = channel.instruments.length;
            while (this._instrumentButtons.length > maxInstrumentsPerChannel) {
                this._instrumentsButtonBar.removeChild(this._instrumentButtons.pop()!);
            }

            this._instrumentRemoveButton.style.display = (channel.instruments.length > Config.instrumentCountMin) ? "" : "none";
            this._instrumentAddButton.style.display = (channel.instruments.length < maxInstrumentsPerChannel) ? "" : "none";
            if (channel.instruments.length < maxInstrumentsPerChannel) {
                this._instrumentRemoveButton.classList.remove("last-button");
            } else {
                this._instrumentRemoveButton.classList.add("last-button");
            }
            if (channel.instruments.length > 1) {
                if (this._highlightedInstrumentIndex != instrumentIndex) {
                    const oldButton: HTMLButtonElement = this._instrumentButtons[this._highlightedInstrumentIndex];
                    if (oldButton != null) oldButton.classList.remove("selected-instrument");
                    const newButton: HTMLButtonElement = this._instrumentButtons[instrumentIndex];
                    newButton.classList.add("selected-instrument");
                    this._highlightedInstrumentIndex = instrumentIndex;
                }
            } else {
                const oldButton: HTMLButtonElement = this._instrumentButtons[this._highlightedInstrumentIndex];
                if (oldButton != null) oldButton.classList.remove("selected-instrument");
                this._highlightedInstrumentIndex = -1;
            }

            if (this._doc.song.layeredInstruments && this._doc.song.patternInstruments && (this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
                //const pattern: Pattern | null = this._doc.getCurrentPattern();
                for (let i: number = 0; i < channel.instruments.length; i++) {
                    if (this._doc.recentPatternInstruments[this._doc.channel].indexOf(i) != -1) {
                        this._instrumentButtons[i].classList.remove("deactivated");
                    } else {
                        this._instrumentButtons[i].classList.add("deactivated");
                    }
                }
                this._deactivatedInstruments = true;
            } else if (this._deactivatedInstruments || (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
                for (let i: number = 0; i < channel.instruments.length; i++) {

                    this._instrumentButtons[i].classList.remove("deactivated");
                }
                this._deactivatedInstruments = false;
            }

            if ((this._doc.song.layeredInstruments && this._doc.song.patternInstruments) && channel.instruments.length > 1 && (this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
                for (let i: number = 0; i < channel.instruments.length; i++) {
                    this._instrumentButtons[i].classList.remove("no-underline");
                }
            }
            else {
                for (let i: number = 0; i < channel.instruments.length; i++) {
                    this._instrumentButtons[i].classList.add("no-underline");
                }
            }
        } else {
            this._instrumentsButtonRow.style.display = "none";
        }
    }

    private _renderWavetableWaveButtons(channel: Channel, colors: ChannelColors) {
        let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        if (instrument.type == InstrumentType.wavetable) {
            this._wavetableWaveButtonsContainer.style.setProperty("--text-color-lit", colors.primaryNote);
            this._wavetableWaveButtonsContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
            this._wavetableWaveButtonsContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
            this._wavetableWaveButtonsContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);
            if (this._currentlySeenWavetableChannel != this._doc.channel || this._currentlySeenWavetableInstrument != this._doc.getCurrentInstrument() || this._highlightedWavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()] != this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()]) {
                const oldButton: HTMLButtonElement | undefined = this._wavetableWaveButtons.find(x => x.classList.contains("selected-wave"));
                if (oldButton != null) oldButton.classList.remove("selected-wave");
                const newButton: HTMLButtonElement = this._wavetableWaveButtons[this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()]];
                newButton.classList.add("selected-wave");
                this._highlightedWavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()] = this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()];
                this._currentlySeenWavetableChannel = this._doc.channel;
                this._currentlySeenWavetableInstrument = this._doc.getCurrentInstrument();
            }
        }
    }

    public updatePlayButton = (): void => {
        if (this._renderedIsPlaying != this._doc.synth.playing || this._renderedIsRecording != this._doc.synth.recording || this._renderedShowRecordButton != this._doc.prefs.showRecordButton || this._renderedCtrlHeld != this._ctrlHeld) {
            this._renderedIsPlaying = this._doc.synth.playing;
            this._renderedIsRecording = this._doc.synth.recording;
            this._renderedShowRecordButton = this._doc.prefs.showRecordButton;
            this._renderedCtrlHeld = this._ctrlHeld;

            if (document.activeElement == this._playButton || document.activeElement == this._pauseButton || document.activeElement == this._recordButton || document.activeElement == this._stopButton) {
                // When a focused element is hidden, focus is transferred to the document, so let's refocus the editor instead to make sure we can still capture keyboard input.
                this.refocusStage();
            }

            this._playButton.style.display = "none";
            this._pauseButton.style.display = "none";
            this._recordButton.style.display = "none";
            this._stopButton.style.display = "none";
            this._prevBarButton.style.display = "";
            this._nextBarButton.style.display = "";
            this._playButton.classList.remove("shrunk");
            this._recordButton.classList.remove("shrunk");
            this._patternEditorRow.style.pointerEvents = "";
            this._octaveScrollBar.container.style.pointerEvents = "";
            this._octaveScrollBar.container.style.opacity = "";
            this._trackContainer.style.pointerEvents = "";
            this._loopEditor.container.style.opacity = "";
            this._instrumentSettingsArea.style.pointerEvents = "";
            this._instrumentSettingsArea.style.opacity = "";
            this._menuArea.style.pointerEvents = "";
            this._menuArea.style.opacity = "";
            this._songSettingsArea.style.pointerEvents = "";
            this._songSettingsArea.style.opacity = "";

            if (this._doc.synth.recording) {
                this._stopButton.style.display = "";
                this._prevBarButton.style.display = "none";
                this._nextBarButton.style.display = "none";
                this._patternEditorRow.style.pointerEvents = "none";
                this._octaveScrollBar.container.style.pointerEvents = "none";
                this._octaveScrollBar.container.style.opacity = "0.5";
                this._trackContainer.style.pointerEvents = "none";
                this._loopEditor.container.style.opacity = "0.5";
                this._instrumentSettingsArea.style.pointerEvents = "none";
                this._instrumentSettingsArea.style.opacity = "0.5";
                this._menuArea.style.pointerEvents = "none";
                this._menuArea.style.opacity = "0.5";
                this._songSettingsArea.style.pointerEvents = "none";
                this._songSettingsArea.style.opacity = "0.5";
            } else if (this._doc.synth.playing) {
                this._pauseButton.style.display = "";
            } else if (this._doc.prefs.showRecordButton) {
                this._playButton.style.display = "";
                this._recordButton.style.display = "";
                this._playButton.classList.add("shrunk");
                this._recordButton.classList.add("shrunk");
            } else if (this._ctrlHeld) {
                this._recordButton.style.display = "";
            } else {
                this._playButton.style.display = "";
            }
        }
        window.requestAnimationFrame(this.updatePlayButton);
    }

    private _onTrackAreaScroll = (event: Event): void => {
		this._doc.barScrollPos = (this._trackAndMuteContainer.scrollLeft / this._doc.getBarWidth());
        this._doc.channelScrollPos = (this._trackAndMuteContainer.scrollTop / ChannelRow.patternHeight);
		//this._doc.notifier.changed();
	}

    private _disableCtrlContextMenu = (event: MouseEvent): boolean => {
        // On a Mac, clicking while holding control opens the right-click context menu.
        // But in the pattern and track editors I'd rather prevent that and instead allow
        // custom behaviors such as setting the volume of a note.
        if (event.ctrlKey) {
            event.preventDefault();
            return false;
        }
        return true;
    }

    private _usageCheck(channelIndex: number, instrumentIndex: number): void {
        var instrumentUsed = false;
        var patternUsed = false;
        var modUsed = false;
        const channel: Channel = this._doc.song.channels[channelIndex];

        if (channelIndex < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
            for (let modChannelIdx: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; modChannelIdx < this._doc.song.channels.length; modChannelIdx++) {
                const modChannel: Channel = this._doc.song.channels[modChannelIdx];
                const patternIdx = modChannel.bars[this._doc.bar];
                if (patternIdx > 0) {
                    const modInstrumentIdx: number = modChannel.patterns[patternIdx - 1].instruments[0];
                    const modInstrument: Instrument = modChannel.instruments[modInstrumentIdx];
                    for (let mod: number = 0; mod < Config.modCount; mod++) {
                        if (modInstrument.modChannels[mod] == channelIndex && (modInstrument.modInstruments[mod] == instrumentIndex || modInstrument.modInstruments[mod] >= channel.instruments.length)) {
                            modUsed = true;
                        }
                    }
                }
            }

            let lowestSelX: number = Math.min(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
            let highestSelX: number = Math.max(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
            let lowestSelY: number = Math.min(this._doc.selection.boxSelectionY0, this._doc.selection.boxSelectionY1);
            let highestSelY: number = Math.max(this._doc.selection.boxSelectionY0, this._doc.selection.boxSelectionY1);

            if (channel.bars[this._doc.bar] != 0) {
                for (let i: number = 0; i < this._doc.song.barCount; i++) {
                // Check for this exact bar in another place, but only count it if it's not within the selection
                if (channel.bars[i] == channel.bars[this._doc.bar] && i != this._doc.bar &&
                    (i < lowestSelX || i > highestSelX || this._doc.channel < lowestSelY || this._doc.channel > highestSelY)) {

                    patternUsed = true;
                    i = this._doc.song.barCount;
                }
            }
        }

            for (let i: number = 0; i < this._doc.song.barCount; i++) {
                // Check for this exact instrument in another place, but only count it if it's not within the selection
                if (channel.bars[i] != 0 && channel.bars[i] != channel.bars[this._doc.bar] &&
                    channel.patterns[channel.bars[i] - 1].instruments.includes(instrumentIndex) && i != this._doc.bar &&
                    (i < lowestSelX || i > highestSelX || this._doc.channel < lowestSelY || this._doc.channel > highestSelY)) {
                }
                instrumentUsed = true;
                i = this._doc.song.barCount;
            }
        }

        if (patternUsed) {
            this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
            this.patternUsed = true;
        }
        else {
            this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
            this.patternUsed = false;
        }
        if (instrumentUsed) {
            this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
        }
        else {
            this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
        }
        if (modUsed) {
            this._jumpToModIndicator.style.setProperty("display", "");
            this._jumpToModIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
            this._jumpToModIndicator.classList.add("modTarget");
        }
        else if (channelIndex < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
            this._jumpToModIndicator.style.setProperty("display", "");
            this._jumpToModIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
            this._jumpToModIndicator.classList.remove("modTarget");
        } else {
            this._jumpToModIndicator.style.setProperty("display", "none");
        }

    }

    private _tempoStepperCaptureNumberKeys = (event: KeyboardEvent): void => {
        // When the number input is in focus, allow some keyboard events to
        // edit the input without accidentally editing the song otherwise.
        switch (event.keyCode) {
            case 8: // backspace/delete
            case 13: // enter/return
            case 38: // up
            case 40: // down
            case 37: // left
            case 39: // right
            case 48: // 0
            case 49: // 1
            case 50: // 2
            case 51: // 3
            case 52: // 4
            case 53: // 5
            case 54: // 6
            case 55: // 7
            case 56: // 8
            case 57: // 9
                event.stopPropagation();
                break;
        }
    }

    private _whenKeyPressed = (event: KeyboardEvent): void => {
        this._ctrlHeld = event.ctrlKey;
        this._shiftHeld = event.shiftKey;

        if (this.prompt) {
            if (this.prompt instanceof CustomChipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomFilterPrompt || this.prompt instanceof WavetablePrompt) {
                this.prompt.whenKeyPressed(event);
            }
            // Special case: CustomChip and Wavetable prompts actually have functions for esc themselves.
            if (event.keyCode == 27 && !(this.prompt instanceof CustomChipPrompt || this.prompt instanceof WavetablePrompt)) { // ESC key
                // Close prompt. This may be a strange way of doing it...
                // The above is correct to some degree. Maybe find a better way to close the prompt???
                this._doc.undo();
            }
            return;
        }

        // Defer to actively editing song title, song subtitle, channel name, or mod label
        if (document.activeElement == this._songTitleInputBox.input || document.activeElement == this._songSubtitleInputBox.input || this._patternEditor.editingModLabel || document.activeElement == this._muteEditor._channelNameInput.input) {
            // Enter/esc returns focus to form
            if (event.keyCode == 13 || event.keyCode == 27) {
                this.mainLayer.focus();
                this._patternEditor.stopEditingModLabel(event.keyCode == 27);
            }

            return;
        }

        // Defer to actively editing other input boxes.
        if   ( document.activeElement == this._panSliderInputBox 
            || document.activeElement == this._pwmSliderInputBox 
            || document.activeElement == this._detuneSliderInputBox 
            //|| document.activeElement == this._noiseSeedInputBox 
            || document.activeElement == this._instrumentVolumeSliderInputBox 
            || document.activeElement == this._octaveStepper 
            || document.activeElement == this._unisonVoicesInputBox
            || document.activeElement == this._unisonSpreadInputBox
            || document.activeElement == this._unisonOffsetInputBox
            || document.activeElement == this._unisonExpressionInputBox
            || document.activeElement == this._unisonSignInputBox
            || document.activeElement == this._wavefoldLowerInputBox
            || document.activeElement == this._wavefoldUpperInputBox
            ){
            // Enter/esc returns focus to form
            if (event.keyCode == 13 || event.keyCode == 27) {
                this.mainLayer.focus();
            }

            return;
        }

        if (this._doc.synth.recording) {
            // The only valid keyboard interactions when recording are playing notes or pressing space OR P to stop.
            if (!event.ctrlKey && !event.metaKey) {
                this._keyboardLayout.handleKeyEvent(event, true);
            }
            if (event.keyCode == 32) { // space
                this._toggleRecord();
                event.preventDefault();
                this.refocusStage();
            } else if (event.keyCode == 80 && (event.ctrlKey || event.metaKey)) { // p
                this._toggleRecord();
                event.preventDefault();
                this.refocusStage();
            }
            return;
        }

        const needControlForShortcuts: boolean = (this._doc.prefs.deactivateCapsLock) && (this._doc.prefs.pressControlForShortcuts != event.getModifierState("CapsLock"));
        const canPlayNotes: boolean = (!event.ctrlKey && !event.metaKey && needControlForShortcuts);
        if (canPlayNotes) this._keyboardLayout.handleKeyEvent(event, true);
        if (!canPlayNotes) this._doc.synth.preferLowerLatency = false;

        //this._trackEditor.onKeyPressed(event);
        switch (event.keyCode) {
            case 27: // ESC key
                if (!event.ctrlKey && !event.metaKey) {
                    new ChangePatternSelection(this._doc, 0, 0);
                    this._doc.selection.resetBoxSelection();
                }
                break;
            case 16: // Shift
                this._patternEditor.shiftMode = true;
                break;
            case 17: // Ctrl
                this._patternEditor.controlMode = true;
                break;
            case 32: // space
                if (event.ctrlKey) {
                    this._toggleRecord();
                } else if (event.shiftKey) {
                    // Jump to mouse
                    if (this._trackEditor.movePlayheadToMouse() || this._patternEditor.movePlayheadToMouse()) {
                        if (!this._doc.synth.playing) this._doc.performance.play();
                    }
                    if (Math.floor(this._doc.synth.playhead) < this._doc.synth.loopBarStart || Math.floor(this._doc.synth.playhead) > this._doc.synth.loopBarEnd) {
                        this._doc.synth.loopBarStart = -1;
                        this._doc.synth.loopBarEnd = -1;
                        this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
                    }
                } else {
                    this.togglePlay();
                }
                event.preventDefault();
                this.refocusStage();
                break;
            case 80: // p
                if (canPlayNotes) break;
                if (event.ctrlKey || event.metaKey) {
                    this._toggleRecord();
                    this._doc.synth.loopBarStart = -1;
                    this._doc.synth.loopBarEnd = -1;
                    this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);

                    event.preventDefault();
                    this.refocusStage();
                } else
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    location.href = "player/#song=" + this._doc.song.toBase64String();
                    event.preventDefault();
                }
                break;
            case 192: // `/~
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    this._doc.goBackToStart();
                this._doc.song.restoreLimiterDefaults();
                for (const channel of this._doc.song.channels) {
                    channel.muted = false;
                    channel.name = "";
                    this._doc.record(new ChangeSong(this._doc, ""), false, true);
                    event.preventDefault();
                }} else {
                    if (canPlayNotes) break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    this._openPrompt("songRecovery");
                }}
                event.preventDefault();
                break;
            case 90: // z
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    this._doc.redo();
                } else {
                    this._doc.undo();
                }
                event.preventDefault();
                break;
            case 88: // x
                if (canPlayNotes) break;
                this._doc.selection.cut();
                event.preventDefault();
                break;
            case 89: // y
                if (canPlayNotes) break;
                this._doc.redo();
                event.preventDefault();
                break;
            case 67: // c
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    this._copyInstrument();
                } else {
                    this._doc.selection.copy();
                }
                this._doc.selection.resetBoxSelection();
                this._doc.selection.selectionUpdated();
                event.preventDefault();
                break;
            case 13: // enter/return
                this._doc.synth.loopBarStart = -1;
                this._doc.synth.loopBarEnd = -1;
                this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);

                if (event.ctrlKey || event.metaKey) {
                    this._doc.selection.insertChannel();
                } else {
                    this._doc.selection.insertBars();
                }
                event.preventDefault();
                break;
            case 8: // backspace/delete
                this._doc.synth.loopBarStart = -1;
                this._doc.synth.loopBarEnd = -1;
                this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);

                if (event.ctrlKey || event.metaKey) {
                    this._doc.selection.deleteChannel();
                } else {
                    this._doc.selection.deleteBars();
                }
                this._barScrollBar.animatePlayhead();
                event.preventDefault();
                break;
            case 65: // a
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    this._doc.selection.selectChannel();
                } else {
                    this._doc.selection.selectAll();
                }
                event.preventDefault();
                break;
            case 66: // b
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._openPrompt("beatsPerBar");
                        event.preventDefault();
                    }
                } else {
                    if (this._doc.prefs.deactivateBKeybind == true) {
                        if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                            const leftSel = Math.min(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
                            const rightSel = Math.max(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
                            if ((leftSel < this._doc.synth.loopBarStart || this._doc.synth.loopBarStart == -1)
                                || (rightSel > this._doc.synth.loopBarEnd || this._doc.synth.loopBarEnd == -1)
                            ) {
                                this._doc.synth.loopBarStart = leftSel;
                                this._doc.synth.loopBarEnd = rightSel;
    
                                if (!this._doc.synth.playing) {
                                    this._doc.synth.snapToBar();
                                    this._doc.performance.play();
                                }
                            }
                            else {
                                this._doc.synth.loopBarStart = -1;
                                this._doc.synth.loopBarEnd = -1;
                            }
    
                            // Pressed while viewing a different bar than the current synth playhead.
                            if (this._doc.bar != Math.floor(this._doc.synth.playhead) && this._doc.synth.loopBarStart != -1) {
    
                                this._doc.synth.goToBar(this._doc.bar);
                                this._doc.synth.snapToBar();
                                this._doc.synth.initModFilters(this._doc.song);
                                this._doc.synth.computeLatestModValues();
                                if (this._doc.prefs.autoFollow) {
                                    this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                                }
    
                            }
    
                            this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
    
                            event.preventDefault();
                        }
                        break;
                        } else {
                            break;
                            }
                }
                break;
            case 68: // d
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    this._doc.selection.duplicatePatterns();
                    event.preventDefault();
                }
                break;
            case 69: // e (+shift: eq filter settings)
                if (event.shiftKey) {
                    const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                    if (!instrument.eqFilterType && this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)
                        this._openPrompt("customEQFilterSettings");
                }
                break;
            case 70: // f
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    this._doc.synth.loopBarStart = -1;
                    this._doc.synth.loopBarEnd = -1;
                    this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);

                    this._doc.synth.snapToStart();
                    this._doc.synth.initModFilters(this._doc.song);
                    this._doc.synth.computeLatestModValues();
                    if (this._doc.prefs.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
                break;
            case 72: // h
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {

                    this._doc.synth.goToBar(this._doc.bar);
                    this._doc.synth.snapToBar();
                    this._doc.synth.initModFilters(this._doc.song);
                    this._doc.synth.computeLatestModValues();

                    if (Math.floor(this._doc.synth.playhead) < this._doc.synth.loopBarStart || Math.floor(this._doc.synth.playhead) > this._doc.synth.loopBarEnd) {
                        this._doc.synth.loopBarStart = -1;
                        this._doc.synth.loopBarEnd = -1;
                        this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
                    }

                    if (this._doc.prefs.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
                break;
            case 74: // j
                if (canPlayNotes) break;
                // Ctrl Alt Shift J: Jummbify - set all prefs to my preferred ones lol
                if (event.shiftKey && event.ctrlKey && event.altKey) {
                    this._doc.prefs.autoPlay = false;
                    this._doc.prefs.autoFollow = false;
                    this._doc.prefs.enableNotePreview = true;
                    this._doc.prefs.showFifth = true;
                    this._doc.prefs.notesOutsideScale = false;
                    this._doc.prefs.defaultScale = 0;
                    this._doc.prefs.showLetters = true;
                    this._doc.prefs.showChannels = true;
                    this._doc.prefs.showScrollBar = true;
                    this._doc.prefs.alwaysFineNoteVol = false;
                    this._doc.prefs.enableChannelMuting = true;
                    this._doc.prefs.displayBrowserUrl = true;
                    this._doc.prefs.displayVolumeBar = true;
                    this._doc.prefs.layout = "wide";
                    this._doc.prefs.visibleOctaves = 5;
                    this._doc.prefs.save();
                    event.preventDefault();
                    location.reload();
                }
                break;
            case 76: // l
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    this._openPrompt("limiterSettings");
                }
                else {
                    this._openPrompt("barCount");
                }
                break;
            case 77: // m
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    if (this._doc.prefs.enableChannelMuting) {
                        this._doc.selection.muteChannels(event.shiftKey);
                        event.preventDefault();
                    }
                }
                break;
            case 78: // n
                if (canPlayNotes) break;
                // Find lowest-index unused pattern for current channel
                // Ctrl+n - lowest-index completely empty pattern
                // Shift+n - note filter settings

                const group: ChangeGroup = new ChangeGroup();

                if (event.shiftKey) {
                    const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                    if (effectsIncludeNoteFilter(instrument.effects) && !instrument.noteFilterType && this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)
                        this._openPrompt("customNoteFilterSettings");
                    break;
                }
                else if (event.ctrlKey) {
                    let nextEmpty: number = 0;
                    while (nextEmpty < this._doc.song.patternsPerChannel && this._doc.song.channels[this._doc.channel].patterns[nextEmpty].notes.length > 0)
                        nextEmpty++;

                    nextEmpty++; // The next empty pattern is actually the one after the found one

                    // Can't set anything if we're at the absolute limit.
                    if (nextEmpty <= Config.barCountMax) {

                        if (nextEmpty > this._doc.song.patternsPerChannel) {

                            // Add extra empty pattern, if all the rest have something in them.
                            group.append(new ChangePatternsPerChannel(this._doc, nextEmpty));
                        }

                        // Change pattern number to lowest-index unused
                        group.append(new ChangePatternNumbers(this._doc, nextEmpty, this._doc.bar, this._doc.channel, 1, 1));

                        // Auto set the used instruments to the ones you were most recently viewing.
                        if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                        this._doc.viewedInstrument[this._doc.channel] = this._doc.recentPatternInstruments[this._doc.channel][0];
                        }
                        group.append(new ChangeSetPatternInstruments(this._doc, this._doc.channel, this._doc.recentPatternInstruments[this._doc.channel],  this._doc.song.channels[this._doc.channel].patterns[nextEmpty-1]));
                    }
                }
                else {
                    let nextUnused: number = 1;
                    while (this._doc.song.channels[this._doc.channel].bars.indexOf(nextUnused) != -1
                        && nextUnused <= this._doc.song.patternsPerChannel)
                        nextUnused++;

                    // Can't set anything if we're at the absolute limit.
                    if (nextUnused <= Config.barCountMax) {

                        if (nextUnused > this._doc.song.patternsPerChannel) {

                            // Add extra empty pattern, if all the rest are used.
                            group.append(new ChangePatternsPerChannel(this._doc, nextUnused));
                        }

                        // Change pattern number to lowest-index unused
                        group.append(new ChangePatternNumbers(this._doc, nextUnused, this._doc.bar, this._doc.channel, 1, 1));

                        // Auto set the used instruments to the ones you were most recently viewing.
                        if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                            this._doc.viewedInstrument[this._doc.channel] = this._doc.recentPatternInstruments[this._doc.channel][0];
                        }
                        group.append(new ChangeSetPatternInstruments(this._doc, this._doc.channel, this._doc.recentPatternInstruments[this._doc.channel],  this._doc.song.channels[this._doc.channel].patterns[nextUnused-1]));
                    }
                }

                this._doc.record(group);

                event.preventDefault();
                break;
            case 81: // q
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    this._openPrompt("channelSettings");
                    event.preventDefault();
                }
                break;
            case 83: // s
                if (canPlayNotes) break;
                if (event.ctrlKey || event.metaKey) {
                    this._openPrompt("export");
                    event.preventDefault();
                } else {
                    if (this._doc.prefs.enableChannelMuting) {
                        // JummBox deviation: I like shift+s as just another mute toggle personally.
                        // Easier to reach than M and the shift+s invert functionality I am overwriting could be 
                        // obtained with M anyway. Useability-wise you very often want to 'add' channels on to a solo as you work.
                        if (event.shiftKey) {
                            this._doc.selection.muteChannels(false);
                        } else {
                            this._doc.selection.soloChannels(false);
                        }
                        event.preventDefault();
                    }
                }
                break;
            case 79: // o
                if (canPlayNotes) break;
                if (event.ctrlKey || event.metaKey) {
                    this._openPrompt("import");
                    event.preventDefault();
                }
                break;
            case 85: // u
                if (canPlayNotes) break;
                if (event.shiftKey) {
                    window.open("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(new URL("#" + this._doc.song.toBase64String(), location.href).href));
                    event.preventDefault();
                }
                break;
            case 86: // v
                if (canPlayNotes) break;
                if ((event.ctrlKey || event.metaKey) && event.shiftKey && !needControlForShortcuts) {
                    this._doc.selection.pasteNumbers();
                } else if (event.shiftKey) {
                    this._pasteInstrument();
                } else {
                    this._doc.selection.pasteNotes();
                }
                event.preventDefault();
                break;
            case 87: // w
                if (canPlayNotes) break;
                this._openPrompt("moveNotesSideways");
                break;
            case 73: // i
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey) && event.shiftKey) {
                    // Copy the current instrument as a preset to the clipboard.
                    const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                    const instrumentObject: any = instrument.toJsonObject();
                    delete instrumentObject["preset"];
                    // Volume and the panning effect are not included in presets.
                    delete instrumentObject["volume"];
                    delete instrumentObject["pan"];
                    const panningEffectIndex: number = instrumentObject["effects"].indexOf(Config.effectNames[EffectType.panning]);
                    if (panningEffectIndex != -1) instrumentObject["effects"].splice(panningEffectIndex, 1);
                    for (let i: number = 0; i < instrumentObject["envelopes"].length; i++) {
                        const envelope: any = instrumentObject["envelopes"][i];
                        // If there are any envelopes targeting panning or none, remove those too.
                        if (envelope["target"] == "panning" || envelope["target"] == "none" || envelope["envelope"] == "none") {
                            instrumentObject["envelopes"].splice(i, 1);
                            i--;
                        }
                    }
                    this._copyTextToClipboard(JSON.stringify(instrumentObject));
                    event.preventDefault();
                }
                break;
            case 82: // r
                if (canPlayNotes) break;
                    if (event.shiftKey) {
                        this._randomGenerated();
                    } else if ((event.ctrlKey || event.metaKey) && (this._doc.prefs.CTRLrEvent == "ctrlRtoRandomGenPrompt")) {
                        this._openPrompt("randomGenSettings");
                    } else if ((event.ctrlKey || event.metaKey) && (this._doc.prefs.CTRLrEvent == "ctrlRtoPageReload")) {
                        break;
                    } else {
                        this._randomPreset();
                    }
                    event.preventDefault();
                break;
            case 219: // left brace
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {

                    this._doc.synth.goToPrevBar();
                    this._doc.synth.initModFilters(this._doc.song);
                    this._doc.synth.computeLatestModValues();
                    if (Math.floor(this._doc.synth.playhead) < this._doc.synth.loopBarStart || Math.floor(this._doc.synth.playhead) > this._doc.synth.loopBarEnd) {
                        this._doc.synth.loopBarStart = -1;
                        this._doc.synth.loopBarEnd = -1;
                        this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
                    }
                    if (this._doc.prefs.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
                break;
            case 221: // right brace
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {

                    this._doc.synth.goToNextBar();
                    this._doc.synth.initModFilters(this._doc.song);
                    this._doc.synth.computeLatestModValues();
                    if (Math.floor(this._doc.synth.playhead) < this._doc.synth.loopBarStart || Math.floor(this._doc.synth.playhead) > this._doc.synth.loopBarEnd) {
                        this._doc.synth.loopBarStart = -1;
                        this._doc.synth.loopBarEnd = -1;
                        this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
                    }
                    if (this._doc.prefs.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
                break;
            case 189: // -
            case 173: // Firefox -
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    this._doc.selection.transpose(false, event.shiftKey);
                    event.preventDefault();
                }
                break;
            case 187: // +
            case 61: // Firefox +
            case 171: // Some users have this as +? Hmm.
                if (canPlayNotes) break;
                if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                    this._doc.selection.transpose(true, event.shiftKey);
                    event.preventDefault();
                }
                break;
            case 38: // up
                if (event.ctrlKey || event.metaKey) {
                    this._doc.selection.swapChannels(-1);
                } else if (event.shiftKey) {
                    this._doc.selection.boxSelectionY1 = Math.max(0, this._doc.selection.boxSelectionY1 - 1);
                    this._doc.selection.scrollToEndOfSelection();
                    this._doc.selection.selectionUpdated();
                } else {
                    this._doc.selection.setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
                    this._doc.selection.resetBoxSelection();
                }
                event.preventDefault();
                break;
            case 40: // down
                if (event.ctrlKey || event.metaKey) {
                    this._doc.selection.swapChannels(1);
                } else if (event.shiftKey) {
                    this._doc.selection.boxSelectionY1 = Math.min(this._doc.song.getChannelCount() - 1, this._doc.selection.boxSelectionY1 + 1);
                    this._doc.selection.scrollToEndOfSelection();
                    this._doc.selection.selectionUpdated();
                } else {
                    this._doc.selection.setChannelBar((this._doc.channel + 1) % this._doc.song.getChannelCount(), this._doc.bar);
                    this._doc.selection.resetBoxSelection();
                }
                event.preventDefault();
                break;
            case 37: // left
                if (event.shiftKey) {
                    this._doc.selection.boxSelectionX1 = Math.max(0, this._doc.selection.boxSelectionX1 - 1);
                    this._doc.selection.scrollToEndOfSelection();
                    this._doc.selection.selectionUpdated();
                } else {
                    this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.barCount - 1) % this._doc.song.barCount);
                    this._doc.selection.resetBoxSelection();
                }
                event.preventDefault();
                break;
            case 39: // right
                if (event.shiftKey) {
                    this._doc.selection.boxSelectionX1 = Math.min(this._doc.song.barCount - 1, this._doc.selection.boxSelectionX1 + 1);
                    this._doc.selection.scrollToEndOfSelection();
                    this._doc.selection.selectionUpdated();
                } else {
                    this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
                    this._doc.selection.resetBoxSelection();
                }
                event.preventDefault();
                break;
            case 46: // Delete
                this._doc.selection.digits = "";
                this._doc.selection.nextDigit("0", false, false);
                break;
            case 48: // 0
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("0", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 49: // 1
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("1", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 50: // 2
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("2", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 51: // 3
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("3", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 52: // 4
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("4", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 53: // 5
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("5", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 54: // 6
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("6", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 55: // 7
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("7", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 56: // 8
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("8", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            case 57: // 9
                if (canPlayNotes) break;
                this._doc.selection.nextDigit("9", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], this._doc.getCurrentInstrument(), ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
                event.preventDefault();
                break;
            default:
                this._doc.selection.digits = "";
                this._doc.selection.instrumentDigits = "";
                break;
        }

        if (canPlayNotes) {
            this._doc.selection.digits = "";
            this._doc.selection.instrumentDigits = "";
        }
    }


    private _whenKeyReleased = (event: KeyboardEvent): void => {
        this._muteEditor.onKeyUp(event);
        if (!event.ctrlKey) { // Ctrl
            this._patternEditor.controlMode = false;
        }
        if (!event.shiftKey) { // Shift
            this._patternEditor.shiftMode = false;
        }

        this._ctrlHeld = event.ctrlKey;
        this._shiftHeld = event.shiftKey;
        // Release live pitches regardless of control or caps lock so that any pitches played before will get released even if the modifier keys changed.
        this._keyboardLayout.handleKeyEvent(event, false);
    }

    private _copyTextToClipboard(text: string): void {
        // Set as any to allow compilation without clipboard types (since, uh, I didn't write this bit and don't know the proper types library) -jummbus
        let nav: any;
        nav = navigator;

        if (nav.clipboard && nav.clipboard.writeText) {
            nav.clipboard.writeText(text).catch(() => {
                window.prompt("Copy to clipboard:", text);
            });
            return;
        }
        const textField: HTMLTextAreaElement = document.createElement("textarea");
        textField.textContent = text;
        document.body.appendChild(textField);
        textField.select();
        const succeeded: boolean = document.execCommand("copy");
        textField.remove();
        this.refocusStage();
        if (!succeeded) window.prompt("Copy this:", text);
    }

    private _whenPrevBarPressed = (): void => {
        if (Math.floor(this._doc.synth.playhead) < this._doc.synth.loopBarStart || Math.floor(this._doc.synth.playhead) > this._doc.synth.loopBarEnd) {
            this._doc.synth.loopBarStart = -1;
            this._doc.synth.loopBarEnd = -1;
            this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
        }
        this._doc.synth.goToPrevBar();
        this._barScrollBar.animatePlayhead();
    }

    private _whenNextBarPressed = (): void => {
        if (Math.floor(this._doc.synth.playhead) < this._doc.synth.loopBarStart || Math.floor(this._doc.synth.playhead) > this._doc.synth.loopBarEnd) {
            this._doc.synth.loopBarStart = -1;
            this._doc.synth.loopBarEnd = -1;
            this._loopEditor.setLoopAt(this._doc.synth.loopBarStart, this._doc.synth.loopBarEnd);
        }
        this._doc.synth.goToNextBar();
        this._barScrollBar.animatePlayhead();
    }

    public togglePlay = (): void => {
        if (this._doc.synth.playing) {
            this._doc.performance.pause();
            this.outVolumeHistoricCap = 0;
        } else {
            this._doc.synth.snapToBar();
            this._doc.performance.play();
        }
    }

    private _toggleRecord = (): void => {
        if (this._doc.synth.playing) {
            this._doc.performance.pause();
        } else {
            this._doc.performance.record();
        }
    }

    public _copyCustomWave = (): void => {
        let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        const chipCopy: Float32Array = instrument.customChipWave;
        window.localStorage.setItem("chipCopy", JSON.stringify(Array.from(chipCopy)));
    }

    public _pasteCustomWave = (): void => {
        const storedChipWave: any = JSON.parse(String(window.localStorage.getItem("chipCopy")));
        this._doc.record(new ChangeCustomWave(this._doc, storedChipWave));
    }

    public _copyWavetableCustomWave = (): void => {
        let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        const chipCopy: Float32Array = instrument.wavetableWaves[this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()]];
        window.localStorage.setItem("chipCopy", JSON.stringify(Array.from(chipCopy)));
    }

    public _pasteWavetableCustomWave = (): void => {
        const storedWavetableChipWave: any = JSON.parse(String(window.localStorage.getItem("chipCopy")));
        this._doc.record(new ChangeWavetableCustomWave(this._doc, storedWavetableChipWave, this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()]));
    }

    public _animate = (): void => {
        // Need to update mods once more to clear the slider display
        this._modSliderUpdate();
        // Same for volume display
        if (this._doc.prefs.displayVolumeBar) {
            this._volumeUpdate();
        }
        // ...and barscrollbar playhead
        this._barScrollBar.animatePlayhead();
        // ...and filters
        if (this._doc.synth.isFilterModActive(false, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._eqFilterEditor.render(true, this._ctrlHeld || this._shiftHeld);
        }
        if (this._doc.synth.isFilterModActive(true, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._noteFilterEditor.render(true, this._ctrlHeld || this._shiftHeld);
        }


        window.requestAnimationFrame(this._animate);
    }

    public _volumeUpdate = (): void => {
        this.outVolumeHistoricTimer--;
        if (this.outVolumeHistoricTimer <= 0) {
            this.outVolumeHistoricCap -= 0.03;
        }
        if (this._doc.song.outVolumeCap > this.outVolumeHistoricCap) {
            this.outVolumeHistoricCap = this._doc.song.outVolumeCap;
            this.outVolumeHistoricTimer = 50;
        }

        if (this._doc.song.outVolumeCap != this.lastOutVolumeCap) {
            this.lastOutVolumeCap = this._doc.song.outVolumeCap;
            this._animateVolume(this._doc.song.outVolumeCap, this.outVolumeHistoricCap);
        }
    }

    private _animateVolume(outVolumeCap: number, historicOutCap: number): void {
        this._outVolumeBar.setAttribute("width", "" + Math.min(144, outVolumeCap * 144));
        this._outVolumeCap.setAttribute("x", "" + (8 + Math.min(144, historicOutCap * 144)));
    }

    private _setVolumeSlider = (): void => {
        // Song volume slider doesn't use a change, but it can still be modulated.
        if ((this._ctrlHeld || this._shiftHeld) && this._doc.synth.playing) {
            const prevVol = this._doc.prefs.volume;
            // The slider only goes to 75, but the mod is 0-100 and in this instance we're using the value for a mod set.
            this._doc.prefs.volume = Math.round(Number(this._volumeSlider.input.value) * 4 / 3);
            const changedPatterns = this._patternEditor.setModSettingsForChange(null, this);
            const useVol: number = this._doc.prefs.volume;
            window.clearTimeout(this._modRecTimeout);
            this._modRecTimeout = window.setTimeout(() => { this._recordVolumeSlider(useVol); }, 10);
            this._doc.recordingModulators = true;

            this._doc.prefs.volume = prevVol;
            this._volumeSlider.updateValue(this._doc.prefs.volume);

            if (changedPatterns)
                this._trackEditor.render();
            }
        else {
            this._doc.setVolume(Number(this._volumeSlider.input.value));
            if (this._doc.recordingModulators) {
                this._doc.recordingModulators = false;
                // A dummy change that pushes history state.
                this._doc.record(new ChangeHoldingModRecording(this._doc, null, null, null));
            }
        }
    }

    private _recordVolumeSlider(useVol: number): void {
        // Song volume slider doesn't use a change, but it can still be modulated.
        if ((this._ctrlHeld || this._shiftHeld) && this._doc.synth.playing) {
            const prevVol = this._doc.prefs.volume;
            // The slider only goes to 75, but the mod is 0-100 and in this instance we're using the value for a mod set.
            this._doc.prefs.volume = useVol;
            this._patternEditor.setModSettingsForChange(null, this);
            window.clearTimeout(this._modRecTimeout);
            this._modRecTimeout = window.setTimeout(() => { this._recordVolumeSlider(useVol); }, 10);
            this._doc.recordingModulators = true;

            this._doc.prefs.volume = prevVol;
            this._volumeSlider.updateValue(this._doc.prefs.volume);
        }
        else {
            this._doc.setVolume(Number(this._volumeSlider.input.value));
            if (this._doc.recordingModulators) {
                this._doc.recordingModulators = false;
                // A dummy change that pushes history state.
                this._doc.record(new ChangeHoldingModRecording(this._doc, null, null, null));
            }
        }
    }

    private _setOscilloscopeScaleSlider = (): void => {
        this._doc.setOscilloscopeScale(Number(this._oscilloscopeScaleSlider.input.value));
    }

    private _copyInstrument = (): void => {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        const instrumentCopy: any = instrument.toJsonObject();
        instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
        instrumentCopy["isMod"] = this._doc.song.getChannelIsMod(this._doc.channel);
        window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
        this.refocusStage();
    }

    private _pasteInstrument = (): void => {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        const instrumentCopy: any = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
        if (instrumentCopy != null && instrumentCopy["isDrum"] == this._doc.song.getChannelIsNoise(this._doc.channel) && instrumentCopy["isMod"] == this._doc.song.getChannelIsMod(this._doc.channel)) {
            this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
        }
        this.refocusStage();
    }

    private _switchEQFilterType(toSimple: boolean) {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        if (instrument.eqFilterType != toSimple) {
            this._doc.record(new ChangeEQFilterType(this._doc, instrument, toSimple));
        }
    }

    private _switchNoteFilterType(toSimple: boolean) {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        if (instrument.noteFilterType != toSimple) {
            this._doc.record(new ChangeNoteFilterType(this._doc, instrument, toSimple));
        }
    }

    private _randomPreset(): void {
        const isNoise: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
        this._doc.record(new ChangePreset(this._doc, pickRandomPresetValue(isNoise)));
    }

    private _randomGenerated(): void {
        this._doc.record(new ChangeRandomGeneratedInstrument(this._doc));
    }


    private _whenSetTempo = (): void => {
        this._doc.record(new ChangeTempo(this._doc, -1, parseInt(this._tempoStepper.value) | 0));
    }

    private _whenSetOctave = (): void => {
        this._doc.record(new ChangeKeyOctave(this._doc, this._doc.song.octave, parseInt(this._octaveStepper.value) | 0));
        this._piano.forceRender();
    }

    private _whenSetScale = (): void => {
        if (isNaN(<number><unknown>this._scaleSelect.value)) {
            switch (this._scaleSelect.value) {
                case "forceScale":
                    this._doc.selection.forceScale();
                    break;
                case "customize":
                    this._openPrompt("customScale")
                    break;
            }
            this._doc.notifier.changed();
        } else {
            this._doc.record(new ChangeScale(this._doc, this._scaleSelect.selectedIndex));
        }
    }

    private _whenSetKey = (): void => {
        if (isNaN(<number><unknown>this._keySelect.value)) {
            switch (this._keySelect.value) {
                case "detectKey":
                    this._doc.record(new ChangeDetectKey(this._doc));
                    break;
            }
            this._doc.notifier.changed();
        } else {
            this._doc.record(new ChangeKey(this._doc, Config.keys.length - 1 - this._keySelect.selectedIndex));
        }
    }

    private _whenSetRhythm = (): void => {
        if (isNaN(<number><unknown>this._rhythmSelect.value)) {
            switch (this._rhythmSelect.value) {
                case "forceRhythm":
                    this._doc.selection.forceRhythm();
                    break;
            }
            this._doc.notifier.changed();
        } else {
            this._doc.record(new ChangeRhythm(this._doc, this._rhythmSelect.selectedIndex));
        }
    }

    public _refocus = (): void => {
        // Waits a bit because select2 "steals" back focus even after the close event fires.
        var selfRef = this;
        setTimeout(function () { selfRef.mainLayer.focus(); }, 20);
    }

    public _whenSetPitchedPreset = (): void => {
        this._setPreset($('#pitchPresetSelect').val() + "");
    }

    public _whenSetDrumPreset = (): void => {
        this._setPreset($('#drumPresetSelect').val() + "");
    }

    private _setPreset(preset: string): void {
        if (isNaN(<number><unknown>preset)) {
            switch (preset) {
                case "copyInstrument":
                    this._copyInstrument();
                    break;
                case "pasteInstrument":
                    this._pasteInstrument();
                    break;
                case "randomPreset":
                    this._randomPreset();
                    break;
                case "randomGenerated":
                    this._randomGenerated();
                    break;
            }
            this._doc.notifier.changed();
        } else {
            this._doc.record(new ChangePreset(this._doc, parseInt(preset)));
        }
    }

    private _whenSetFeedbackType = (): void => {
        this._doc.record(new ChangeFeedbackType(this._doc, this._feedbackTypeSelect.selectedIndex));
    }


    private _whenSetAlgorithm = (): void => {
        this._doc.record(new ChangeAlgorithm(this._doc, this._algorithmSelect.selectedIndex));
    }

    private _whenSet6OpFeedbackType = (): void => {
        this._doc.record(new Change6OpFeedbackType(this._doc, this._feedback6OpTypeSelect.selectedIndex));
        this._customAlgorithmCanvas.reset()
    }

    private _whenSet6OpAlgorithm = (): void => {
        this._doc.record(new Change6OpAlgorithm(this._doc, this._algorithm6OpSelect.selectedIndex));
        this._customAlgorithmCanvas.reset()
    }

    private _whenSelectInstrument = (event: MouseEvent): void => {
        if (event.target == this._instrumentAddButton) {
            this._doc.record(new ChangeAddChannelInstrument(this._doc));
        } else if (event.target == this._instrumentRemoveButton) {
            this._doc.record(new ChangeRemoveChannelInstrument(this._doc));
        } else {
            const index: number = this._instrumentButtons.indexOf(<any>event.target);
            if (index != -1) {
                this._doc.selection.selectInstrument(index);
            }
            // Force piano to re-show, if channel is modulator
            if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                this._piano.forceRender();
            }
            this._renderInstrumentBar(this._doc.song.channels[this._doc.channel], index, ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
        }

        this.refocusStage();
    }

    private _whenSelectWavetableWave = (event: MouseEvent): void => {
        const index: number = this._wavetableWaveButtons.indexOf(<any>event.target);
        if (index != -1) {
            this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()] = index;
            this._wavetableCustomWaveDrawCanvas.index = this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()];
            this._wavetableCustomWaveDrawCanvas.redrawCanvas();
            this._renderWavetableWaveButtons(this._doc.song.channels[this._doc.channel], ColorConfig.getChannelColor(this._doc.song, this._doc.channel));
        }
        this.refocusStage();
    }

    private _whenSetModChannel = (mod: number): void => {

        let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        let previouslyUnset: boolean = (instrument.modulators[mod] == 0 || Config.modulators[instrument.modulators[mod]].forSong);

        this._doc.selection.setModChannel(mod, this._modChannelBoxes[mod].selectedIndex);

        const modChannel: number = Math.max(0, instrument.modChannels[mod]);

        // Check if setting was 'song' or 'none' and is changing to a channel number, in which case suggested instrument to mod will auto-set to the current one.
        if (this._doc.song.channels[modChannel].instruments.length > 1 && previouslyUnset && this._modChannelBoxes[mod].selectedIndex >= 2) {
            if (this._doc.song.channels[modChannel].bars[this._doc.bar] > 0) {
                this._doc.selection.setModInstrument(mod, this._doc.song.channels[modChannel].patterns[this._doc.song.channels[modChannel].bars[this._doc.bar] - 1].instruments[0]);
            }
        }

        // Force piano to re-show
        this._piano.forceRender();
    }

    private _whenSetModInstrument = (mod: number): void => {
        this._doc.selection.setModInstrument(mod, this._modInstrumentBoxes[mod].selectedIndex);

        // Force piano to re-show
        this._piano.forceRender();
    }

    private _whenSetModSetting = (mod: number, invalidIndex: boolean = false): void => {
        let text: string = "none";
        if (this._modSetBoxes[mod].selectedIndex != -1) {
            text = this._modSetBoxes[mod].children[this._modSetBoxes[mod].selectedIndex].textContent as string;

            if (invalidIndex) {
                // A setting is invalid (not in instrument's effects). It will be the first index. Allow it, but mark it as red.
                this._modSetBoxes[mod].selectedOptions.item(0)!.style.setProperty("color", "red");
                this._modSetBoxes[mod].classList.add("invalidSetting");
                this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].invalidModulators[mod] = true;
            } else {
                this._modSetBoxes[mod].classList.remove("invalidSetting");
                this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].invalidModulators[mod] = false;
            }
        }
        if (!invalidIndex) // Invalid index means a set is actually not occurring, just the same index and a warning.
            this._doc.selection.setModSetting(mod, text);

        // Force piano to re-show if channel is modulator, as text shown on it needs to update
        this._piano.forceRender();

    }

    private _whenClickModTarget = (mod: number): void => {
        if (this._modChannelBoxes[mod].selectedIndex >= 2) {
            this._doc.selection.setChannelBar(this._modChannelBoxes[mod].selectedIndex - 2, this._doc.bar);
        }
    }

    private _whenClickJumpToModTarget = (): void => {
        const channelIndex: number = this._doc.channel;
        const instrumentIndex: number = this._doc.getCurrentInstrument();
        if (channelIndex < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
            for (let modChannelIdx: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; modChannelIdx < this._doc.song.channels.length; modChannelIdx++) {
                const modChannel: Channel = this._doc.song.channels[modChannelIdx];
                const patternIdx = modChannel.bars[this._doc.bar];
                if (patternIdx > 0) {
                    const modInstrumentIdx: number = modChannel.patterns[patternIdx - 1].instruments[0];
                    const modInstrument: Instrument = modChannel.instruments[modInstrumentIdx];
                    for (let mod: number = 0; mod < Config.modCount; mod++) {
                        if (modInstrument.modChannels[mod] == channelIndex && (modInstrument.modInstruments[mod] == instrumentIndex || modInstrument.modInstruments[mod] >= this._doc.song.channels[channelIndex].instruments.length)) {
                            this._doc.selection.setChannelBar(modChannelIdx, this._doc.bar);
                            return;
                        }
                    }
                }
            }
        }
    }

    private _whenSetModFilter = (mod: number): void => {
        this._doc.selection.setModFilter(mod, this._modFilterBoxes[mod].selectedIndex);
    }

    private _whenSetChipWave = (): void => {
        this._doc.record(new ChangeChipWave(this._doc, this._chipWaveSelect.selectedIndex));
    }

    private _whenSetNoiseWave = (): void => {
        this._doc.record(new ChangeNoiseWave(this._doc, this._chipNoiseSelect.selectedIndex));
    }



    private _whenSetTransition = (): void => {
        this._doc.record(new ChangeTransition(this._doc, this._transitionSelect.selectedIndex));
    }

    private _whenSetEffects = (): void => {
        const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        const oldValue: number = instrument.effects;
        const toggleFlag: number = Config.effectOrder[this._effectsSelect.selectedIndex - 1];
        this._doc.record(new ChangeToggleEffects(this._doc, toggleFlag, null));
        this._effectsSelect.selectedIndex = 0;
        if (instrument.effects > oldValue) {
            this._doc.addedEffect = true;
        }
        this._doc.notifier.changed();
    }

    private _whenSetVibrato = (): void => {
        this._doc.record(new ChangeVibrato(this._doc, this._vibratoSelect.selectedIndex));
    }

    private _whenSetVibratoType = (): void => {
        this._doc.record(new ChangeVibratoType(this._doc, this._vibratoTypeSelect.selectedIndex));
    }

    private _whenSetUnison = (): void => {
        this._doc.record(new ChangeUnison(this._doc, this._unisonSelect.selectedIndex));
    }

    private _whenSetChord = (): void => {
        this._doc.record(new ChangeChord(this._doc, this._chordSelect.selectedIndex));
    }

    private _whenSetArpeggioPattern = (): void => {
        this._doc.record(new ChangeArpeggioPattern(this._doc, this._arpeggioPatternSelect.selectedIndex));
    }

    private _addNewEnvelope = (): void => {
        this._doc.record(new ChangeAddEnvelope(this._doc));
        this.refocusStage();
        this._doc.addedEnvelope = true;
    }

    private _zoomIn = (): void => {
        this._doc.prefs.visibleOctaves = Math.max(1, this._doc.prefs.visibleOctaves - 1);
        this._doc.prefs.save();
        this._doc.notifier.changed();
        this.refocusStage();
    }

    private _zoomOut = (): void => {
        this._doc.prefs.visibleOctaves = Math.min(Config.pitchOctaves, this._doc.prefs.visibleOctaves + 1);
        this._doc.prefs.save();
        this._doc.notifier.changed();
        this.refocusStage();
    }

    private _fileMenuHandler = (event: Event): void => {
        switch (this._fileMenu.value) {
            case "new":
                this._doc.goBackToStart();
                this._doc.song.restoreLimiterDefaults();
                for (const channel of this._doc.song.channels) {
                    channel.muted = false;
                    channel.name = "";
                }
                this._doc.record(new ChangeSong(this._doc, ""), false, true);
                break;
            case "export":
                this._openPrompt("export");
                break;
            case "import":
                this._openPrompt("import");
                break;
            case "copyUrl":
                this._copyTextToClipboard(new URL("#" + this._doc.song.toBase64String(), location.href).href);
                break;
            case "shareUrl":
                (<any>navigator).share({ url: new URL("#" + this._doc.song.toBase64String(), location.href).href });
                break;
            case "shortenUrl":
                window.open("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(new URL("#" + this._doc.song.toBase64String(), location.href).href));
                break;
            case "viewPlayer":
                location.href = "player/#song=" + this._doc.song.toBase64String();
                break;
            case "copyEmbed":
                this._copyTextToClipboard(`<iframe width="384" height="60" style="border: none;" src="${new URL("player/#song=" + this._doc.song.toBase64String(), location.href).href}"></iframe>`);
                break;
            case "songRecovery":
                this._openPrompt("songRecovery");
                break;
        }
        this._fileMenu.selectedIndex = 0;
    }

    private _editMenuHandler = (event: Event): void => {
        switch (this._editMenu.value) {
            case "undo":
                this._doc.undo();
                break;
            case "redo":
                this._doc.redo();
                break;
            case "copy":
                this._doc.selection.copy();
                break;
            case "cut":
                this._doc.selection.cut();
                break;
            case "insertBars":
                this._doc.selection.insertBars();
                break;
            case "deleteBars":
                this._doc.selection.deleteBars();
                break;
            case "insertChannel":
                this._doc.selection.insertChannel();
                break;
            case "deleteChannel":
                this._doc.selection.deleteChannel();
                break;
            case "pasteNotes":
                this._doc.selection.pasteNotes();
                break;
            case "pasteNumbers":
                this._doc.selection.pasteNumbers();
                break;
            case "transposeUp":
                this._doc.selection.transpose(true, false);
                break;
            case "transposeDown":
                this._doc.selection.transpose(false, false);
                break;
            case "selectAll":
                this._doc.selection.selectAll();
                break;
            case "selectChannel":
                this._doc.selection.selectChannel();
                break;
            case "duplicatePatterns":
                this._doc.selection.duplicatePatterns();
                break;
            case "barCount":
                this._openPrompt("barCount");
                break;
            case "beatsPerBar":
                this._openPrompt("beatsPerBar");
                break;
            case "moveNotesSideways":
                this._openPrompt("moveNotesSideways");
                break;
            case "channelSettings":
                this._openPrompt("channelSettings");
                break;
            case "limiterSettings":
                this._openPrompt("limiterSettings");
                break;
            case "randomGenSettings":
                this._openPrompt("randomGenSettings");
                break;
        }
        this._editMenu.selectedIndex = 0;
    }

    private _optionsMenuHandler = (event: Event): void => {
        switch (this._optionsMenu.value) {
            case "autoPlay":
                this._doc.prefs.autoPlay = !this._doc.prefs.autoPlay;
                break;
            case "autoFollow":
                this._doc.prefs.autoFollow = !this._doc.prefs.autoFollow;
                break;
            case "enableNotePreview":
                this._doc.prefs.enableNotePreview = !this._doc.prefs.enableNotePreview;
                break;
            case "showLetters":
                this._doc.prefs.showLetters = !this._doc.prefs.showLetters;
                break;
            case "showFifth":
                this._doc.prefs.showFifth = !this._doc.prefs.showFifth;
                break;
            case "notesOutsideScale":
                this._doc.prefs.notesOutsideScale = !this._doc.prefs.notesOutsideScale;
                break;
            case "setDefaultScale":
                this._doc.prefs.defaultScale = this._doc.song.scale;
                break;
            case "showChannels":
                this._doc.prefs.showChannels = !this._doc.prefs.showChannels;
                break;
            case "showScrollBar":
                this._doc.prefs.showScrollBar = !this._doc.prefs.showScrollBar;
                break;
            case "alwaysFineNoteVol":
                this._doc.prefs.alwaysFineNoteVol = !this._doc.prefs.alwaysFineNoteVol;
                break;
            case "enableChannelMuting":
                this._doc.prefs.enableChannelMuting = !this._doc.prefs.enableChannelMuting;
                for (const channel of this._doc.song.channels) channel.muted = false;
                break;
            case "displayBrowserUrl":
                this._doc.toggleDisplayBrowserUrl();
                break;
            case "displayVolumeBar":
                this._doc.prefs.displayVolumeBar = !this._doc.prefs.displayVolumeBar;
                break;
            case "showOscilloscope":
                this._doc.prefs.showOscilloscope = !this._doc.prefs.showOscilloscope;
                break;
            case "language":
                this._openPrompt("language");
                break;
            case "layout":
                this._openPrompt("layout");
                break;
            case "colorTheme":
                this._openPrompt("theme");
                break;
            case "recordingSetup":
                this._openPrompt("recordingSetup");
                break;
            case "keybindSetup":
                this._openPrompt("keybindSetup")
                break;
        }
        this._optionsMenu.selectedIndex = 0;
        this._doc.notifier.changed();
        this._doc.prefs.save();
    }

    private _customWavePresetHandler = (event: Event): void => {

        // Update custom wave value
        let customWaveArray: Float32Array = new Float32Array(64);
        let index: number = this._customWavePresetDrop.selectedIndex - 1;
        let maxValue: number = Number.MIN_VALUE;
        let minValue: number = Number.MAX_VALUE;
        let arrayPoint: number = 0;
        let arrayStep: number = (Config.chipWaves[index].samples.length - 1) / 64.0;

        for (let i: number = 0; i < 64; i++) {
            // Compute derivative to get original wave.
            customWaveArray[i] = (Config.chipWaves[index].samples[Math.floor(arrayPoint)] - Config.chipWaves[index].samples[(Math.floor(arrayPoint) + 1)]) / arrayStep;

            if (customWaveArray[i] < minValue)
                minValue = customWaveArray[i];

            if (customWaveArray[i] > maxValue)
                maxValue = customWaveArray[i];

            // Scale an any-size array to 64 elements
            arrayPoint += arrayStep;
        }

        for (let i: number = 0; i < 64; i++) {
            // Change array range from Min~Max to 0~(Max-Min)
            customWaveArray[i] -= minValue;
            // Divide by (Max-Min) to get a range of 0~1,
            customWaveArray[i] /= (maxValue - minValue);
            //then multiply by 48 to get 0~48,
            customWaveArray[i] *= 48.0;
            //then subtract 24 to get - 24~24
            customWaveArray[i] -= 24.0;
            //need to force integers
            customWaveArray[i] = Math.ceil(customWaveArray[i]);

            // Copy back data to canvas
            this._customWaveDrawCanvas.newArray[i] = customWaveArray[i];
        }

        this._doc.record(new ChangeCustomWave(this._doc, customWaveArray))
        //this._doc.record(new ChangeVolume(this._doc, +this._instrumentVolumeSlider.input.value, -Config.volumeRange / 2 + Math.round(Math.sqrt(Config.chipWaves[index].expression) * Config.volumeRange / 2)));

        this._customWavePresetDrop.selectedIndex = 0;
        this._doc.notifier.changed();
        this._doc.prefs.save();
    }

    private _wavetableCustomWavePresetHandler = (event: Event): void => {

        // Update custom wave value
        let customWaveArray: Float32Array = new Float32Array(64);
        let index: number = this._wavetableCustomWavePresetDrop.selectedIndex - 1;
        let maxValue: number = Number.MIN_VALUE;
        let minValue: number = Number.MAX_VALUE;
        let arrayPoint: number = 0;
        let arrayStep: number = (Config.chipWaves[index].samples.length - 1) / 64.0;

        for (let i: number = 0; i < 64; i++) {
            // Compute derivative to get original wave.
            customWaveArray[i] = (Config.chipWaves[index].samples[Math.floor(arrayPoint)] - Config.chipWaves[index].samples[(Math.floor(arrayPoint) + 1)]) / arrayStep;

            if (customWaveArray[i] < minValue)
                minValue = customWaveArray[i];

            if (customWaveArray[i] > maxValue)
                maxValue = customWaveArray[i];

            // Scale an any-size array to 64 elements
            arrayPoint += arrayStep;
        }

        for (let i: number = 0; i < 64; i++) {
            // Change array range from Min~Max to 0~(Max-Min)
            customWaveArray[i] -= minValue;
            // Divide by (Max-Min) to get a range of 0~1,
            customWaveArray[i] /= (maxValue - minValue);
            //then multiply by 48 to get 0~48,
            customWaveArray[i] *= 48.0;
            //then subtract 24 to get - 24~24
            customWaveArray[i] -= 24.0;
            //need to force integers
            customWaveArray[i] = Math.ceil(customWaveArray[i]);

            // Copy back data to canvas
            this._wavetableCustomWaveDrawCanvas.newArray[i] = customWaveArray[i];
        }

        this._doc.record(new ChangeWavetableCustomWave(this._doc, customWaveArray, this._wavetableIndices[this._doc.channel][this._doc.getCurrentInstrument()]))
        //this._doc.record(new ChangeVolume(this._doc, +this._instrumentVolumeSlider.input.value, -Config.volumeRange / 2 + Math.round(Math.sqrt(Config.chipWaves[index].expression) * Config.volumeRange / 2)));
        // Comment this out since the wavetable shouldn't have all wave volumes changed just for one wave.

        this._wavetableCustomWavePresetDrop.selectedIndex = 0;
        this._doc.notifier.changed();
        this._doc.prefs.save();
    }
}