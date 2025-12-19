// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {InstrumentType, Config, DropdownID} from "../synth/SynthConfig";
import {Instrument, EnvelopeComputer, LFOShapes} from "../synth/synth";
import {ColorConfig} from "./ColorConfig";
import {SongDocument} from "./SongDocument";
import {ChangeSetEnvelopeTarget, ChangeSetEnvelopeType, ChangeRemoveEnvelope, ChangeEnvelopeOrder, ChangePerEnvelopeSpeed, ChangeDiscreteEnvelope, ChangeLowerBound, ChangeUpperBound, ChangeEnvelopeDelay, ChangePitchEnvelopeStart, ChangePitchEnvelopeEnd, ChangePitchAmplify, ChangePitchBounce, ChangeEnvelopePosition, ChangeMeasurementType, ChangeClapMirrorAmount, ChangeEnvelopeTargetRange, ChangeLFOEnvelopeShape, ChangeEnvelopeAccelerationEnabled, ChangeEnvelopeLooping, ChangeEnvelopeIgnorance, ChangeEnvelopeAcceleration, ChangeLFOEnvelopePulseWidth, ChangeLFOEnvelopeTrapezoidRatio, ChangeLFOEnvelopeStairsStepAmount, ChangePasteEnvelope, RandomEnvelope} from "./changes";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict";
import {Knob} from "./KnobElement";
import {clamp, remap} from "./UsefulCodingStuff";
import {Change} from "./Change";

const {div, span, canvas, option, input, button, select} = HTML;

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    for (let index: number = 0; index < items.length; index++) {
        menu.appendChild(option({ value: index }, items[index]));
    }
    return menu;
}

export class EnvelopeLineGraph {
	public lowerRange: number = 0;
	public upperRange: number = 4;
	public lowerHeight: number = 0;
	public upperHeight: number = 1;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, public index: number, public forDrumset: boolean) {
		this.render();
    }

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
		const envelopeGraph: number[] = [];
		let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		
		let instEnv, envelope;
		if (this.forDrumset) {
			instEnv = instrument.drumsetEnvelopes[this.index];
			envelope = Config.drumsetEnvelopes[instEnv.envelope];
		} else {
			instEnv = instrument.envelopes[this.index];
			envelope = Config.envelopes[instEnv.envelope];
		}
		let speed: number = instEnv.envelopeSpeed;
		let delay: number = instEnv.delay;
		let phase: number = instEnv.phase;
		let LFOStepAmount: number = instEnv.LFOSettings.LFOStepAmount;
		const beatsPerTick: number = 1.0 / (Config.ticksPerPart * Config.partsPerBeat);
		const beatsPerMinute: number = this._doc.song != null ? this._doc.song.getBeatsPerMinute() : 0;
        const beatsPerSecond: number = beatsPerMinute / 60.0;
        const partsPerSecond: number = Config.partsPerBeat * beatsPerSecond;
        const tickPerSecond: number = Config.ticksPerPart * partsPerSecond;
        const samplesPerTick: number = this._doc.synth.samplesPerSecond / tickPerSecond;
		const secondsPerTick: number = samplesPerTick / this._doc.synth.samplesPerSecond;
		let xAxisIsInSeconds: boolean = instEnv.measurementType === false;
		let timeRangeInBeats: number = this.upperRange;
		let timeRangeInSeconds: number = this.upperRange / beatsPerTick * secondsPerTick;
		let delayInBeats: number = delay * speed;
		let delayInSeconds: number = delayInBeats / beatsPerTick * secondsPerTick;
		let phaseInBeats: number = phase * speed;
		let phaseInSeconds: number = phaseInBeats / beatsPerTick * secondsPerTick;
		if (xAxisIsInSeconds) {
			timeRangeInBeats = this.upperRange / secondsPerTick * beatsPerTick;
			timeRangeInSeconds = this.upperRange;
			delayInSeconds = delay * speed;
			delayInBeats = delayInSeconds / secondsPerTick * beatsPerTick;
			phaseInSeconds = phase * speed;
			phaseInBeats = phaseInSeconds / secondsPerTick * beatsPerTick;
		}
		let qualitySteps: number = 750;
		for (let i: number = 0; i < qualitySteps; i++) {
			const x: number = i / (qualitySteps - 1);
			const seconds: number = (x * (timeRangeInSeconds - this.lowerRange) + this.lowerRange) * speed;
			const beats: number = (x * (timeRangeInBeats - this.lowerRange) + this.lowerRange) * speed;
			const beatNote: number = (x * (timeRangeInBeats - this.lowerRange) + this.lowerRange) * speed;
			const noteSize: number = (1 - x) * Config.noteSizeMax;
			const pitch: number = 1;
			let value = EnvelopeComputer.computeEnvelope(envelope, seconds, beats, beatNote, noteSize, instEnv.lowerBound, instEnv.upperBound, delayInBeats, delayInSeconds, phaseInBeats, phaseInSeconds, pitch, instEnv.mirrorAmount, instEnv.LFOSettings.LFOShape, instEnv.LFOSettings.LFOActiveCheckbox == 1 ? instEnv.LFOSettings.LFOAcceleration : 1, instEnv.LFOSettings.LFOActiveCheckbox == 2 ? true : false, instEnv.LFOSettings.LFOActiveCheckbox == 3 ? true : false, instEnv.LFOSettings.LFOPulseWidth * 5, instEnv.LFOSettings.LFOTrapezoidRatio, LFOStepAmount, false);
			envelopeGraph.push(value);
		}

		var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, graphWidth, graphHeight);

		// Draw background.
		ctx.fillStyle = ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, graphX, graphY);

		// Proceed to draw envelope graph.
		ctx.strokeStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryChannel;
		ctx.beginPath();
		if (this.lowerRange >= this.upperRange || this.lowerHeight >= this.upperHeight) {
			// Invalid time range.
			ctx.strokeStyle = "red";
			ctx.moveTo(0, 0);
			ctx.lineTo(graphWidth, graphHeight);
		} else {
			ctx.strokeStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryChannel;
			for (let i: number = 0; i < qualitySteps; i++) {
				const value: number = envelopeGraph[i];
				const x = graphX + remap(i, 0, qualitySteps - 1, 0, graphWidth);
				const y = (graphY + remap(value, this.lowerHeight, this.upperHeight, graphHeight, 0));
				if (i == 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
		}
		ctx.lineWidth = 2.5;
		ctx.stroke();
	}

	public render() {
		this._drawCanvas(0, 0, this.canvas.width, this.canvas.height);
	}
}

export class EnvelopeEditor {
	public readonly container: HTMLElement = div({class: "envelopeEditor"});
	
	// Everything must be declared as arrays for each envelope
	// Properly given styles and what not in render()
	private readonly _rows: HTMLDivElement[] = [];
	private readonly _plotterLowerTimeRangeInputs: HTMLInputElement[] = [];
	private readonly _plotterUpperTimeRangeInputs: HTMLInputElement[] = [];
	private readonly _plotterLowerHeightInputs: HTMLInputElement[] = [];
	private readonly _plotterUpperHeightInputs: HTMLInputElement[] = [];
	private readonly _envelopePlotters: EnvelopeLineGraph[] = [];
	private readonly _envelopePlotterRow1s: HTMLElement[] = [];
	private readonly _envelopePlotterRow2s: HTMLElement[] = [];
	private readonly _perEnvelopeSpeedKnobs: Knob[] = [];
	private readonly _perEnvelopeSpeedInputBoxes: HTMLInputElement[] = [];
	private readonly _perEnvelopeSpeedColumns: HTMLElement[] = [];
	private readonly _discreteEnvelopeToggles: HTMLInputElement[] = [];
	private readonly _discreteEnvelopeColumns: HTMLElement[] = [];
	private readonly _lowerBoundKnobs: Knob[] = [];
	private readonly _upperBoundKnobs: Knob[] = [];
	private readonly _lowerBoundInputBoxes: HTMLInputElement[] = [];
	private readonly _upperBoundInputBoxes: HTMLInputElement[] = [];
	private readonly _lowerBoundColumns: HTMLElement[] = [];
	private readonly _upperBoundColumns: HTMLElement[] = [];
	private readonly _primaryEnvelopeSettingRows: HTMLElement[] = [];
	private readonly _envelopeDelayKnobs: Knob[] = [];
	private readonly _envelopeDelayInputBoxes: HTMLInputElement[] = [];
	private readonly _envelopeDelayColumns: HTMLElement[] = [];
	private readonly _pitchStartKnobs: Knob[] = [];
	private readonly _pitchStartInputBoxes: HTMLInputElement[] = [];
	private readonly _pitchStartNoteTexts: HTMLSpanElement[] = [];
	private readonly _pitchEndKnobs: Knob[] = [];
	private readonly _pitchEndInputBoxes: HTMLInputElement[] = [];
	private readonly _pitchEndNoteTexts: HTMLSpanElement[] = [];
	private readonly _pitchStartGroups: HTMLElement[] = [];
	private readonly _pitchEndGroups: HTMLElement[] = [];
	private readonly _pitchAmplifyToggles: HTMLInputElement[] = [];
	private readonly _pitchBounceToggles: HTMLInputElement[] = [];
	private readonly _pitchEnvelopeSettingRows: HTMLElement[] = [];
	private readonly _envelopePhaseKnobs: Knob[] = [];
	private readonly _envelopePhaseInputBoxes: HTMLInputElement[] = [];
	private readonly _envelopePhaseColumns: HTMLElement[] = [];
	private readonly _measureInSecondButtons: HTMLButtonElement[] = [];
	private readonly _measureInBeatButtons: HTMLButtonElement[] = [];
	private readonly _measurementTypeColumns: HTMLElement[] = [];
	private readonly _positioningSettingRows: HTMLElement[] = [];
	private readonly _clapMirrorAmountSliders: HTMLInputElement[] = [];
	private readonly _clapMirrorAmountInputBoxes: HTMLInputElement[] = [];
	private readonly _clapMirrorAmountRows: HTMLElement[] = [];
	private readonly _envelopeCopyButtons: HTMLButtonElement[] = [];
	private readonly _envelopePasteButtons: HTMLButtonElement[] = [];
	private readonly _randomEnvelopeButtons: HTMLButtonElement[] = [];
	private readonly _envelopeMoveUpButtons: HTMLButtonElement[] = [];
	private readonly _envelopeMoveDownButtons: HTMLButtonElement[] = [];
	private readonly _pitchEnvAutoBoundButtons: HTMLButtonElement[] = [];
	private readonly _customEnvelopePromptButtons: HTMLButtonElement[] = [];
	private readonly _alternateRangeToggles: HTMLInputElement[] = [];
	private readonly _LFOShapeSelects: HTMLSelectElement[] = [];
	private readonly _LFOShapeRows: HTMLElement[] = [];
	private readonly _LFOEnableAccelerationToggles: HTMLInputElement[] = [];
	private readonly _LFOLoopOnceToggles: HTMLInputElement[] = [];
	private readonly _LFOIgnoranceToggles: HTMLInputElement[] = [];
	private readonly _LFORadioButtonRows: HTMLElement[] = [];
	private readonly _LFOAccelerationSliders: HTMLInputElement[] = [];
	private readonly _LFOAccelerationInputBoxes: HTMLInputElement[] = [];
	private readonly _LFOAccelerationRows: HTMLElement[] = [];
	private readonly _LFOPulseWidthSliders: HTMLInputElement[] = [];
	private readonly _LFOPulseWidthRows: HTMLElement[] = [];
	private readonly _LFOTrapezoidRatioSliders: HTMLInputElement[] = [];
	private readonly _LFOTrapezoidRatioRows: HTMLElement[] = [];
	private readonly _LFOStairsStepAmountSliders: HTMLInputElement[] = [];
	private readonly _LFOStairsStepAmountInputBoxes: HTMLInputElement[] = [];
	private readonly _LFOStairsStepAmountRows: HTMLElement[] = [];
	private readonly _envelopeDropdownGroups: HTMLElement[] = [];
	private readonly _envelopeDropdowns: HTMLButtonElement[] = [];
	private readonly _targetSelects: HTMLSelectElement[] = [];
	private readonly _envelopeSelects: HTMLSelectElement[] = [];
	private readonly _deleteButtons: HTMLButtonElement[] = [];
	private _lastChange: Change | null = null;
	private _renderedEnvelopeCount: number = 0;
	private _renderedEqFilterCount: number = -1;
	private _renderedNoteFilterCount: number = -1;
	private _renderedInstrumentType: InstrumentType;
	private _renderedEffects: number = 0;
	private _renderedFMOperatorWaveforms: number[] = [];
	private _openPerEnvelopeDropdowns: boolean[] = [];
	
	constructor(private _doc: SongDocument, private _openPrompt: (name: string, extraNumber?: number, extraBoolean?: boolean) => void) {
		this.container.addEventListener("change", this._onChange);
		this.container.addEventListener("input", this._onInput);
		this.container.addEventListener("click", this._onClick);
		this.container.addEventListener("keydown", this._typingInInput);

		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		for (let envelopeIndex: number = this._rows.length; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			this._openPerEnvelopeDropdowns[envelopeIndex] = false;
		}
	}
	
	private _onInput = (event: Event) => {
		const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

		// For sliders here, we'll only record the change in _onChange(). Instead, just assign the
		// change class to this._lastChange but don't record yet.
		const plotterLowerTimeRangeInputIndex = this._plotterLowerTimeRangeInputs.indexOf(<any> event.target);
		const plotterUpperTimeRangeInputIndex = this._plotterUpperTimeRangeInputs.indexOf(<any> event.target);
		const plotterLowerHeightInputIndex = this._plotterLowerHeightInputs.indexOf(<any> event.target);
		const plotterUpperHeightInputIndex = this._plotterUpperHeightInputs.indexOf(<any> event.target);
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedKnobIndex = this._perEnvelopeSpeedKnobs.indexOf(<any> event.target);
		const discreteEnvelopeToggleIndex = this._discreteEnvelopeToggles.indexOf(<any> event.target);
		const lowerBoundInputBoxIndex = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const lowerBoundKnobIndex = this._lowerBoundKnobs.indexOf(<any> event.target);
		const upperBoundInputBoxIndex = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundKnobIndex = this._upperBoundKnobs.indexOf(<any> event.target);
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelayKnobIndex = this._envelopeDelayKnobs.indexOf(<any> event.target);
		const startInputBoxIndex = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const startKnobIndex = this._pitchStartKnobs.indexOf(<any>event.target);
		const endKnobIndex = this._pitchEndKnobs.indexOf(<any>event.target);
		const pitchAmplifyToggleIndex = this._pitchAmplifyToggles.indexOf(<any> event.target);
		const pitchBounceToggleIndex = this._pitchBounceToggles.indexOf(<any> event.target);
		const envelopePhaseInputBoxIndex = this._envelopePhaseInputBoxes.indexOf(<any> event.target);
		const envelopePhaseKnobIndex = this._envelopePhaseKnobs.indexOf(<any> event.target);
		const clapMirrorAmountInputBoxIndex = this._clapMirrorAmountInputBoxes.indexOf(<any> event.target);
		const clapMirrorAmountSliderIndex = this._clapMirrorAmountSliders.indexOf(<any> event.target);
		const alternateRangeToggleIndex =  this._alternateRangeToggles.indexOf(<any> event.target);
		const LFOEnableAccelerationToggleIndex = this._LFOEnableAccelerationToggles.indexOf(<any> event.target);
		const LFOLoopOnceToggleIndex = this._LFOLoopOnceToggles.indexOf(<any> event.target);
		const LFOIgnoranceToggleIndex = this._LFOIgnoranceToggles.indexOf(<any> event.target);
		const LFOAccelerationInputBoxIndex = this._LFOAccelerationInputBoxes.indexOf(<any> event.target);
		const LFOAccelerationSliderIndex = this._LFOAccelerationSliders.indexOf(<any> event.target);
		const LFOPulseWidthSliderIndex = this._LFOPulseWidthSliders.indexOf(<any> event.target);
		const LFOTrapezoidRatioSliderIndex = this._LFOTrapezoidRatioSliders.indexOf(<any> event.target);
		const LFOStairsStepAmountInputBoxIndex = this._LFOStairsStepAmountInputBoxes.indexOf(<any> event.target);
		const LFOStairsStepAmountSliderIndex = this._LFOStairsStepAmountSliders.indexOf(<any> event.target);

		if (plotterLowerTimeRangeInputIndex != -1) {
			this._changeLowerTimeRange(plotterLowerTimeRangeInputIndex, this._envelopePlotters[plotterLowerTimeRangeInputIndex].lowerRange, +(this._plotterLowerTimeRangeInputs[plotterLowerTimeRangeInputIndex].value));
		}
		if (plotterUpperTimeRangeInputIndex != -1) {
			this._changeUpperTimeRange(plotterUpperTimeRangeInputIndex, this._envelopePlotters[plotterUpperTimeRangeInputIndex].upperRange, +(this._plotterUpperTimeRangeInputs[plotterUpperTimeRangeInputIndex].value));
		}
		if (plotterLowerHeightInputIndex != -1) {
			this._changeLowerHeight(plotterLowerHeightInputIndex, this._envelopePlotters[plotterLowerHeightInputIndex].lowerHeight, +(this._plotterLowerHeightInputs[plotterLowerHeightInputIndex].value));
		}
		if (plotterUpperHeightInputIndex != -1) {
			this._changeUpperHeight(plotterUpperHeightInputIndex, this._envelopePlotters[plotterUpperHeightInputIndex].upperHeight, +(this._plotterUpperHeightInputs[plotterUpperHeightInputIndex].value));
		}
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			this._lastChange = new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedInputBoxIndex, instrument.envelopes[perEnvelopeSpeedInputBoxIndex].envelopeSpeed, +(this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedInputBoxIndex].value));
		}
		if (perEnvelopeSpeedKnobIndex != -1) {
			this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedKnobIndex].value = String(this._perEnvelopeSpeedKnobs[perEnvelopeSpeedKnobIndex].value);
			this._lastChange = new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedKnobIndex, instrument.envelopes[perEnvelopeSpeedKnobIndex].envelopeSpeed, +(this._perEnvelopeSpeedKnobs[perEnvelopeSpeedKnobIndex].value));
		}
		if (discreteEnvelopeToggleIndex != -1) {
			this._doc.record(new ChangeDiscreteEnvelope(this._doc, discreteEnvelopeToggleIndex, this._discreteEnvelopeToggles[discreteEnvelopeToggleIndex].checked));
		}
		if (lowerBoundInputBoxIndex != -1) {
			this._lastChange = new ChangeLowerBound(this._doc, lowerBoundInputBoxIndex, instrument.envelopes[lowerBoundInputBoxIndex].lowerBound, +(this._lowerBoundInputBoxes[lowerBoundInputBoxIndex].value));
		}
		if (lowerBoundKnobIndex != -1) {
			this._lowerBoundInputBoxes[lowerBoundKnobIndex].value = String(this._lowerBoundKnobs[lowerBoundKnobIndex].value);
			this._lastChange = new ChangeLowerBound(this._doc, lowerBoundKnobIndex, instrument.envelopes[lowerBoundKnobIndex].lowerBound, +(this._lowerBoundKnobs[lowerBoundKnobIndex].value));
		}
		if (upperBoundInputBoxIndex != -1) {
			this._lastChange = new ChangeUpperBound(this._doc, upperBoundInputBoxIndex, instrument.envelopes[upperBoundInputBoxIndex].upperBound, +(this._upperBoundInputBoxes[upperBoundInputBoxIndex].value));
		}
		if (upperBoundKnobIndex != -1) {
			this._upperBoundInputBoxes[upperBoundKnobIndex].value = String(this._upperBoundKnobs[upperBoundKnobIndex].value);
			this._lastChange = new ChangeUpperBound(this._doc, upperBoundKnobIndex, instrument.envelopes[upperBoundKnobIndex].upperBound, +(this._upperBoundKnobs[upperBoundKnobIndex].value));
		}
		if (envelopeDelayInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopeDelay(this._doc, envelopeDelayInputBoxIndex, instrument.envelopes[envelopeDelayInputBoxIndex].delay, +(this._envelopeDelayInputBoxes[envelopeDelayInputBoxIndex].value));
		}
		if (envelopeDelayKnobIndex != -1) {
			this._envelopeDelayInputBoxes[envelopeDelayKnobIndex].value = String(this._envelopeDelayKnobs[envelopeDelayKnobIndex].value);
			this._lastChange = new ChangeEnvelopeDelay(this._doc, envelopeDelayKnobIndex, instrument.envelopes[envelopeDelayKnobIndex].delay, +(this._envelopeDelayKnobs[envelopeDelayKnobIndex].value));
		}
		if (startInputBoxIndex != -1) {
			this._lastChange = new ChangePitchEnvelopeStart(this._doc, startInputBoxIndex, instrument.envelopes[startInputBoxIndex].pitchStart, +(this._pitchStartInputBoxes[startInputBoxIndex].value));
		}
		if (endInputBoxIndex != -1) {
			this._lastChange = new ChangePitchEnvelopeEnd(this._doc, endInputBoxIndex, instrument.envelopes[endInputBoxIndex].pitchEnd, +(this._pitchEndInputBoxes[endInputBoxIndex].value));
		} 
		if (startKnobIndex != -1) {
			this._pitchStartInputBoxes[startKnobIndex].value = String(this._pitchStartKnobs[startKnobIndex].value);
			this._pitchStartNoteTexts[startKnobIndex].textContent = String("‣ Start " + this._pitchToNote(parseInt(this._pitchStartInputBoxes[startKnobIndex].value), instrument.isNoiseInstrument) + ":");
			this._lastChange = new ChangePitchEnvelopeStart(this._doc, startKnobIndex, instrument.envelopes[startKnobIndex].pitchStart, +(this._pitchStartKnobs[startKnobIndex].value));
		} 
		if (endKnobIndex != -1) {
			this._pitchEndInputBoxes[endKnobIndex].value = String(this._pitchEndKnobs[endKnobIndex].value);
			this._pitchEndNoteTexts[endKnobIndex].textContent = String("‣ End " + this._pitchToNote(parseInt(this._pitchEndInputBoxes[endKnobIndex].value), instrument.isNoiseInstrument) + ":");
			this._lastChange = new ChangePitchEnvelopeEnd(this._doc, endKnobIndex, instrument.envelopes[endKnobIndex].pitchEnd, +(this._pitchEndKnobs[endKnobIndex].value));
		}
		if (pitchAmplifyToggleIndex != -1) {
			this._doc.record(new ChangePitchAmplify(this._doc, pitchAmplifyToggleIndex, this._pitchAmplifyToggles[pitchAmplifyToggleIndex].checked));
		}
		if (pitchBounceToggleIndex != -1) {
			this._doc.record(new ChangePitchBounce(this._doc, pitchBounceToggleIndex, this._pitchBounceToggles[pitchBounceToggleIndex].checked));
		}
		if (envelopePhaseInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopePosition(this._doc, envelopePhaseInputBoxIndex, instrument.envelopes[envelopePhaseInputBoxIndex].phase, +(this._envelopePhaseInputBoxes[envelopePhaseInputBoxIndex].value));
		}
		if (envelopePhaseKnobIndex != -1) {
			this._envelopePhaseInputBoxes[envelopePhaseKnobIndex].value = String(this._envelopePhaseKnobs[envelopePhaseKnobIndex].value);
			this._lastChange = new ChangeEnvelopePosition(this._doc, envelopePhaseKnobIndex, instrument.envelopes[envelopePhaseKnobIndex].phase, +(this._envelopePhaseKnobs[envelopePhaseKnobIndex].value));
		}
		if (clapMirrorAmountInputBoxIndex != -1) {
			this._lastChange = new ChangeClapMirrorAmount(this._doc, clapMirrorAmountInputBoxIndex, instrument.envelopes[clapMirrorAmountInputBoxIndex].mirrorAmount, +(this._clapMirrorAmountInputBoxes[clapMirrorAmountInputBoxIndex].value));
		}
		if (clapMirrorAmountSliderIndex != -1) {
			this._clapMirrorAmountInputBoxes[clapMirrorAmountSliderIndex].value = this._clapMirrorAmountSliders[clapMirrorAmountSliderIndex].value;
			this._lastChange = new ChangeClapMirrorAmount(this._doc, clapMirrorAmountSliderIndex, instrument.envelopes[clapMirrorAmountSliderIndex].mirrorAmount, +(this._clapMirrorAmountSliders[clapMirrorAmountSliderIndex].value));
		}
		if (alternateRangeToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeTargetRange(this._doc, alternateRangeToggleIndex, this._alternateRangeToggles[alternateRangeToggleIndex].checked));
		}
		if (LFOEnableAccelerationToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeAccelerationEnabled(this._doc, LFOEnableAccelerationToggleIndex));
		}
		if (LFOLoopOnceToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeLooping(this._doc, LFOLoopOnceToggleIndex));
		}
		if (LFOIgnoranceToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeIgnorance(this._doc, LFOIgnoranceToggleIndex));
		}
		if (LFOAccelerationInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopeAcceleration(this._doc, LFOAccelerationInputBoxIndex, instrument.envelopes[LFOAccelerationInputBoxIndex].LFOSettings.LFOAcceleration, +(this._LFOAccelerationInputBoxes[LFOAccelerationInputBoxIndex].value));
		}
		if (LFOAccelerationSliderIndex != -1) {
			this._LFOAccelerationInputBoxes[LFOAccelerationSliderIndex].value = this._LFOAccelerationSliders[LFOAccelerationSliderIndex].value;
			this._lastChange = new ChangeEnvelopeAcceleration(this._doc, LFOAccelerationSliderIndex, instrument.envelopes[LFOAccelerationSliderIndex].LFOSettings.LFOAcceleration, +(this._LFOAccelerationSliders[LFOAccelerationSliderIndex].value));
		}
		if (LFOPulseWidthSliderIndex != -1) {
			this._lastChange = new ChangeLFOEnvelopePulseWidth(this._doc, LFOPulseWidthSliderIndex, instrument.envelopes[LFOPulseWidthSliderIndex].LFOSettings.LFOPulseWidth, +(this._LFOPulseWidthSliders[LFOPulseWidthSliderIndex].value));
		}
		if (LFOTrapezoidRatioSliderIndex != -1) {
			this._lastChange = new ChangeLFOEnvelopeTrapezoidRatio(this._doc, LFOTrapezoidRatioSliderIndex, instrument.envelopes[LFOTrapezoidRatioSliderIndex].LFOSettings.LFOTrapezoidRatio, +(this._LFOTrapezoidRatioSliders[LFOTrapezoidRatioSliderIndex].value));
		}
		if (LFOStairsStepAmountInputBoxIndex != -1) {
			this._lastChange = new ChangeLFOEnvelopeStairsStepAmount(this._doc, LFOStairsStepAmountInputBoxIndex, instrument.envelopes[LFOStairsStepAmountInputBoxIndex].LFOSettings.LFOStepAmount, +(this._LFOStairsStepAmountInputBoxes[LFOStairsStepAmountInputBoxIndex].value));
		}
		if (LFOStairsStepAmountSliderIndex != -1) {
			this._LFOStairsStepAmountInputBoxes[LFOStairsStepAmountSliderIndex].value = this._LFOStairsStepAmountSliders[LFOStairsStepAmountSliderIndex].value;
			this._lastChange = new ChangeLFOEnvelopeStairsStepAmount(this._doc, LFOStairsStepAmountSliderIndex, instrument.envelopes[LFOStairsStepAmountSliderIndex].LFOSettings.LFOStepAmount, +(this._LFOStairsStepAmountSliders[LFOStairsStepAmountSliderIndex].value));
		}
	}

	private _onChange = (event: Event): void => {
		const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

		const targetSelectIndex: number = this._targetSelects.indexOf(<any> event.target);
		const envelopeSelectIndex: number = this._envelopeSelects.indexOf(<any> event.target);
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedKnobIndex = this._perEnvelopeSpeedKnobs.indexOf(<any> event.target);
		const lowerBoundInputBoxIndex = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundInputBoxIndex = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const lowerBoundKnobIndex = this._lowerBoundKnobs.indexOf(<any> event.target);
		const upperBoundKnobIndex = this._upperBoundKnobs.indexOf(<any> event.target);
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelayKnobIndex = this._envelopeDelayKnobs.indexOf(<any> event.target);
		const startInputBoxIndex = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const startKnobIndex = this._pitchStartKnobs.indexOf(<any>event.target);
		const endKnobIndex = this._pitchEndKnobs.indexOf(<any>event.target);
		const envelopePhaseInputBoxIndex = this._envelopePhaseInputBoxes.indexOf(<any> event.target);
		const envelopePhaseKnobIndex = this._envelopePhaseKnobs.indexOf(<any> event.target);
		const clapMirrorAmountInputBoxIndex = this._clapMirrorAmountInputBoxes.indexOf(<any> event.target);
		const clapMirrorAmountSliderIndex = this._clapMirrorAmountSliders.indexOf(<any> event.target);
		const LFOShapeSelectIndex = this._LFOShapeSelects.indexOf(<any> event.target);
		const LFOAccelerationInputBoxIndex = this._LFOAccelerationInputBoxes.indexOf(<any> event.target);
		const LFOAccelerationSliderIndex = this._LFOAccelerationSliders.indexOf(<any> event.target);
		const LFOPulseWidthSliderIndex = this._LFOPulseWidthSliders.indexOf(<any> event.target);
		const LFOTrapezoidRatioSliderIndex = this._LFOTrapezoidRatioSliders.indexOf(<any> event.target);
		const LFOStairsStepAmountInputBoxIndex = this._LFOStairsStepAmountInputBoxes.indexOf(<any> event.target);
		const LFOStairsStepAmountSliderIndex = this._LFOStairsStepAmountSliders.indexOf(<any> event.target);

		if (targetSelectIndex != -1) {
			const combinedValue: number = parseInt(this._targetSelects[targetSelectIndex].value);
			const target: number = combinedValue % Config.instrumentAutomationTargets.length;
			const index: number = (combinedValue / Config.instrumentAutomationTargets.length) >>> 0;
			this._doc.record(new ChangeSetEnvelopeTarget(this._doc, targetSelectIndex, target, index));
		} else if (envelopeSelectIndex != -1) {
			this._doc.record(new ChangeSetEnvelopeType(this._doc, envelopeSelectIndex, this._envelopeSelects[envelopeSelectIndex].selectedIndex));
		}
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (perEnvelopeSpeedKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (lowerBoundInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (upperBoundInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (lowerBoundKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (upperBoundKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopeDelayInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopeDelayKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (startInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (endInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (startKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (endKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopePhaseInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopePhaseKnobIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (clapMirrorAmountInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (clapMirrorAmountSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOShapeSelectIndex != -1) {
			this._doc.record(new ChangeLFOEnvelopeShape(this._doc, LFOShapeSelectIndex, instrument.envelopes[LFOShapeSelectIndex].LFOSettings.LFOShape, this._LFOShapeSelects[LFOShapeSelectIndex].selectedIndex));
		}
		if (LFOAccelerationInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOAccelerationSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOPulseWidthSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOTrapezoidRatioSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOStairsStepAmountInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOStairsStepAmountSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
	}

	private _changeLowerTimeRange(envelopeIndex: number, oldValue: number, newValue: number): void {
        if (oldValue != newValue) {
            this._envelopePlotters[envelopeIndex].lowerRange = newValue;
            this._doc.notifier.changed();
        }
	}
	private _changeUpperTimeRange(envelopeIndex: number, oldValue: number, newValue: number): void {
        if (oldValue != newValue) {
            this._envelopePlotters[envelopeIndex].upperRange = newValue;
            this._doc.notifier.changed();
        }
	}
	private _changeLowerHeight(envelopeIndex: number, oldValue: number, newValue: number): void {
        if (oldValue != newValue) {
            this._envelopePlotters[envelopeIndex].lowerHeight = newValue;
            this._doc.notifier.changed();
        }
	}
	private _changeUpperHeight(envelopeIndex: number, oldValue: number, newValue: number): void {
        if (oldValue != newValue) {
            this._envelopePlotters[envelopeIndex].upperHeight = newValue;
            this._doc.notifier.changed();
        }
	}

	private _onClick = (event: MouseEvent): void => {
		// Commented-out code is a failed dropdown opening system for the movement buttons.
		//let dropdownStatus: boolean;

		const deleteButtonIndex: number = this._deleteButtons.indexOf(<any> event.target);
		const moveUpButtonIndex: number = this._envelopeMoveUpButtons.indexOf(<any> event.target);
		const moveDownButtonIndex: number = this._envelopeMoveDownButtons.indexOf(<any> event.target);

		if (deleteButtonIndex != -1) {
			this._doc.record(new ChangeRemoveEnvelope(this._doc, deleteButtonIndex));
		}
		if (moveUpButtonIndex != -1) {
			//dropdownStatus = this._openPerEnvelopeDropdowns[moveUpButtonIndex-1];
			this._doc.record(new ChangeEnvelopeOrder(this._doc, moveUpButtonIndex, true));
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex] = dropdownStatus;
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex-1] = true;
		}
		if (moveDownButtonIndex != -1) {
			//dropdownStatus = this._openPerEnvelopeDropdowns[moveUpButtonIndex+1];
			this._doc.record(new ChangeEnvelopeOrder(this._doc, moveDownButtonIndex, false));
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex] = dropdownStatus;
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex+1] = true;
		}
	}

	private _typingInInput = (event: KeyboardEvent): void => {
		const plotterLowerTimeRangeInputIndex: number = this._plotterLowerTimeRangeInputs.indexOf(<any> event.target);
		const plotterUpperTimeRangeInputIndex: number = this._plotterUpperTimeRangeInputs.indexOf(<any> event.target);
		const plotterLowerHeightInputIndex: number = this._plotterLowerHeightInputs.indexOf(<any> event.target);
		const plotterUpperHeightInputIndex: number = this._plotterUpperHeightInputs.indexOf(<any> event.target);
		const perEnvelopeSpeedInputBoxIndex: number = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const lowerBoundInputBoxIndex: number = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundInputBoxIndex: number = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const envelopeDelayInputBoxIndex: number = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const startInputBoxIndex: number = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex: number = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const envelopePhaseInputBoxIndex: number = this._envelopePhaseInputBoxes.indexOf(<any>event.target);
		const clapMirrorAmountInputBoxIndex: number = this._clapMirrorAmountInputBoxes.indexOf(<any> event.target);
		const LFOAccelerationInputBoxIndex: number = this._LFOAccelerationInputBoxes.indexOf(<any> event.target);
		const LFOStairsStepAmountInputBoxIndex: number = this._LFOStairsStepAmountInputBoxes.indexOf(<any> event.target);

		if (plotterLowerTimeRangeInputIndex != -1) event.stopPropagation();
		if (plotterUpperTimeRangeInputIndex != -1) event.stopPropagation();
		if (plotterLowerHeightInputIndex != -1) event.stopPropagation();
		if (plotterUpperHeightInputIndex != -1) event.stopPropagation();
		if (perEnvelopeSpeedInputBoxIndex != -1) event.stopPropagation();
		if (lowerBoundInputBoxIndex != -1) event.stopPropagation();
		if (upperBoundInputBoxIndex != -1) event.stopPropagation();
		if (envelopeDelayInputBoxIndex != -1) event.stopPropagation();
		if (startInputBoxIndex != -1) event.stopPropagation();
		if (endInputBoxIndex != -1) event.stopPropagation();
		if (envelopePhaseInputBoxIndex != -1) event.stopPropagation();
		if (clapMirrorAmountInputBoxIndex != -1) event.stopPropagation();
		if (LFOAccelerationInputBoxIndex != -1) event.stopPropagation();
		if (LFOStairsStepAmountInputBoxIndex != -1) event.stopPropagation();
	}
	
	private _makeOption(target: number, index: number): HTMLOptionElement {
		let displayName = Config.instrumentAutomationTargets[target].displayName;
		if (Config.instrumentAutomationTargets[target].maxCount > 1) {
			if (displayName.indexOf("#") != -1) {
				displayName = displayName.replace("#", String(index+1));
			} else {
				displayName += " " + (index+1);
			}
		}
		return option({value: target + index * Config.instrumentAutomationTargets.length}, displayName);
	}
	
	private _updateTargetOptionVisibility(menu: HTMLSelectElement, instrument: Instrument): void {
		for (let optionIndex: number = 0; optionIndex < menu.childElementCount; optionIndex++) {
			const option: HTMLOptionElement = <HTMLOptionElement> menu.children[optionIndex];
			const combinedValue: number = parseInt(option.value);
			const target: number = combinedValue % Config.instrumentAutomationTargets.length;
			const index: number = (combinedValue / Config.instrumentAutomationTargets.length) >>> 0;
			option.hidden = !instrument.supportsEnvelopeTarget(target, index);
		}
	}

	private _pitchToNote(value: number, isNoise: boolean): string {
		let text = "";
		if (isNoise) value = value * 6 + 12;
		const offset: number = Config.keys[this._doc.song.key].basePitch % Config.pitchesPerOctave;
		const keyValue = (value + offset) % Config.pitchesPerOctave;
		if (Config.keys[keyValue].isWhiteKey) {
			text = Config.keys[keyValue].name;
		} else {
			const shiftDir: number = Config.blackKeyNameParents[value % Config.pitchesPerOctave];
			text = Config.keys[(keyValue + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave].name;
			if (shiftDir == 1) {
				text += "♭";
			} else if (shiftDir == -1) {
				text += "♯";
			}
		}
		return "[" + text + Math.floor((value + Config.pitchesPerOctave) / 12 + this._doc.song.octave - 1) + "]";
	}

	public render(): void {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let drumPitchEnvBoolean: boolean = instrument.isNoiseInstrument;
		
		for (let envelopeIndex: number = this._rows.length; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			const plotterLowerTimeRangeInput: HTMLInputElement = input({class: "plotterInputBox", style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 8.1em; font-size: 80%; vertical-align: middle;`, id: "lowerTimeRangeInput", type: "number", step: "0.01", min: "0", max: "249.99", value: "0"});
			const plotterUpperTimeRangeInput: HTMLInputElement = input({class: "plotterInputBox", style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 8.15em; font-size: 80%; margin-left: -2px; vertical-align: middle;`, id: "upperTimeRangeInput", type: "number", step: "0.01", min: "0.01", max: "250", value: "4"});
			const envelopePlotterRow1: HTMLElement = div({ class: "selectRow dropFader", style: "margin-left: 3px; margin-bottom: 8px; margin-top: -2px;" }, div({},
				div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -1px; width: 14.1em;" }, plotterLowerTimeRangeInput, plotterUpperTimeRangeInput),
			));
			const plotterLowerHeightInput: HTMLInputElement = input({class: "plotterInputBox", style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 1.25em; height: 2.88em; font-size: 80%;`, id: "lowerHeightInput", type: "number", step: "0.01", min: "0", max: "15.99", value: "0"});
			const plotterUpperHeightInput: HTMLInputElement = input({class: "plotterInputBox", style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 1.25em; height: 2.87em; font-size: 80%;`, id: "upperHeightInput", type: "number", step: "0.01", min: "0.01", max: "16", value: "1"});
			const envelopePlotter: EnvelopeLineGraph = new EnvelopeLineGraph(canvas({ width: 160, height: 65, style: `cursor: help; border: 2px solid ${ColorConfig.uiWidgetBackground}; margin-left: -52px;`, id: "EnvelopeLineGraph", onclick: () => this._openPrompt("envelopePlotter") }), this._doc, envelopeIndex, false);
			const envelopePlotterRow2: HTMLElement = div({class: "selectRow dropFader", style: "margin-left: 3px; margin-top: 16px; margin-bottom: 16px;"}, 
				div({ style: "display: grid; grid: repeat(2, 33px) / auto-flow; width: 20px; margin-top: -19px;"}, 
					div({ style: "color: " + ColorConfig.secondaryText + ";" }, plotterUpperHeightInput),
					div({ style: "color: " + ColorConfig.secondaryText + ";" }, plotterLowerHeightInput),
				),
				div({ style: "margin-top: -20px; height: 65px;"}, envelopePlotter.canvas),
			);
			const perEnvelopeSpeedKnob: Knob = new Knob(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax, 0.25, [1], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangePerEnvelopeSpeed(this._doc, envelopeIndex, oldValue, newValue));
			const perEnvelopeSpeedInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "perEnvelopeSpeedInputBox", type: "number", step: "0.001", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1"});
			const perEnvelopeSpeedColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px;"},
				span({class: "tip", style: "height: 1em; font-size: 10.25px; text-align: center;", onclick: () => this._openPrompt("perEnvelopeSpeed")}, span("Env Spd:")),
				div({style: "margin-left: 6.5px;"}, perEnvelopeSpeedKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, perEnvelopeSpeedInputBox)
			);
			const discreteEnvelopeToggle: HTMLInputElement = input({style: "width: 3em; padding: 0; margin-right: 3em;", type: "checkbox"});
			const discreteEnvelopeColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px; margin-top: 20px;"},
				span({class: "tip", style: "height: 1em; width: 30px; margin-left: 4px; font-size: 10.25px; text-align: center;", onclick: () => this._openPrompt("discreteEnvelope")}, span("Discrete:")),
				discreteEnvelopeToggle,
			);
			const lowerBoundKnob: Knob = new Knob(Config.lowerBoundMin, Config.lowerBoundMax, 0.25, [1], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangeLowerBound(this._doc, envelopeIndex, oldValue, newValue));
			const upperBoundKnob: Knob = new Knob(Config.lowerBoundMin, Config.lowerBoundMax, 0.25, [1], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangeUpperBound(this._doc, envelopeIndex, oldValue, newValue));
			const lowerBoundInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "lowerBoundInputBox", type: "number", step: "0.01", min: Config.lowerBoundMin, max: Config.lowerBoundMax, value: "0"});
			const upperBoundInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "upperBoundInputBox", type: "number", step: "0.01", min: Config.upperBoundMin, max: Config.upperBoundMax, value: "1"});
			const lowerBoundColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px;"},
				span({class: "tip", style: "height: 1em; font-size: 10.25px; text-align: center;", onclick: () => this._openPrompt("envelopeBounds")}, span("Lwr Bnd:")),
				div({style: "margin-left: 6.5px;"}, lowerBoundKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, lowerBoundInputBox)
			);
			const upperBoundColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px;"},
				span({class: "tip", style: "height: 1em; font-size: 10.25px; text-align: center;", onclick: () => this._openPrompt("envelopeBounds")}, span("Upr Bnd:")),
				div({style: "margin-left: 6.5px;"}, upperBoundKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, upperBoundInputBox)
			);
			const primaryEnvelopeSettingRow: HTMLElement = div({class: "selectRow dropFader", style: "width: 192px; height: 20px; margin-bottom: 42px; margin-top: -6px;"}, perEnvelopeSpeedColumn, lowerBoundColumn, upperBoundColumn, discreteEnvelopeColumn);
			const envelopeDelayKnob: Knob = new Knob(0, Config.envelopeDelayMax, 0.5, [], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangeEnvelopeDelay(this._doc, envelopeIndex, oldValue, newValue));
			const envelopeDelayInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "envelopeDelayInputBox", type: "number", step: "0.01", min: 0, max: Config.envelopeDelayMax, value: "0"});
			const envelopeDelayColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px;"},
				span({class: "tip", style: "height: 1em; font-size: 11px; text-align: center;", onclick: () => this._openPrompt("envelopeDelay")}, span("Delay:")),
				div({style: "margin-left: 6.5px;"}, envelopeDelayKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, envelopeDelayInputBox)
			);
			const pitchStartKnob: Knob = new Knob(drumPitchEnvBoolean ? 1 : 0, drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, 1, [], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangePitchEnvelopeStart(this._doc, envelopeIndex, oldValue, newValue));
			const pitchStartInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "pitchStartInputBox", type: "number", step: "1", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: "0"});
			const pitchStartNoteText: HTMLSpanElement = span({class: "tip", style: "height: 1em; font-size: 9px; text-align: center; width: 47px; white-space: nowrap; margin-left: -2px;", onclick: () => this._openPrompt("pitchEnvelope")}, span("Start " + this._pitchToNote(parseInt(pitchStartInputBox.value), drumPitchEnvBoolean) + ":"));
			const pitchEndKnob: Knob = new Knob(drumPitchEnvBoolean ? 1 : 0, drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, 1, [], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangePitchEnvelopeEnd(this._doc, envelopeIndex, oldValue, newValue));
			const pitchEndInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "pitchEndInputBox", type: "number", step: "1", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch});
			const pitchEndNoteText: HTMLSpanElement = span({class: "tip", style: "height: 1em; font-size: 9px; text-align: center; width: 47px; white-space: nowrap;", onclick: () => this._openPrompt("pitchEnvelope")}, span("End " + this._pitchToNote(parseInt(pitchEndInputBox.value), drumPitchEnvBoolean) + ":"));
			const pitchStartGroup: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px;"},
				pitchStartNoteText,
				div({style: "margin-left: 6.5px;"}, pitchStartKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, pitchStartInputBox)
			);
			const pitchEndGroup: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px;"},
				pitchEndNoteText,
				div({style: "margin-left: 6.5px;"}, pitchEndKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, pitchEndInputBox)
			);
			const pitchAmplifyToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const pitchBounceToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const pitchEnvelopeSettingRow: HTMLElement = div({class: "selectRow dropFader", style: "width: 192px; height: 20px; margin-bottom: 48px; margin-top: -6px;"}, 
				pitchStartGroup, 
				pitchEndGroup, 
				div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px; margin-top: 20px;"},
					span({class: "tip", style: "height: 1em; width: 30px; margin-left: 4px; font-size: 10.5px; text-align: center;", onclick: () => this._openPrompt("extraPitchEnvSettings")}, span("Amplify:")),
					pitchAmplifyToggle,
				),
				div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px; margin-top: 20px;"},
					span({class: "tip", style: "height: 1em; width: 30px; margin-left: 5px; font-size: 10.5px; text-align: center;", onclick: () => this._openPrompt("extraPitchEnvSettings")}, span("Bounce:")),
					pitchBounceToggle,
				)
			);
			const envelopePhaseKnob: Knob = new Knob(0, Config.envelopePhaseMax, 0.25, [], 0.25, this._doc, (oldValue: number, newValue: number) => new ChangeEnvelopePosition(this._doc, envelopeIndex, oldValue, newValue));
			const envelopePhaseInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "envelopePhaseInputBox", type: "number", step: "0.01", min: 0, max: Config.envelopePhaseMax, value: "0"});
			const envelopePhaseColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px; margin-left: 4px;"},
				span({class: "tip", style: "height: 1em; font-size: 11px; text-align: center;", onclick: () => this._openPrompt("envelopePhase")}, span("Position:")),
				div({style: "margin-left: 6.5px;"}, envelopePhaseKnob.container),
				div({style: `color: ${ColorConfig.secondaryText}; font-size: 90%;`}, envelopePhaseInputBox)
			);
			const measureInBeatsButton: HTMLButtonElement = button({ style: "font-size: 90%; width: 70px; height: 25px;", class: "no-underline", onclick: () => this._switchMeasurementType(true, envelopeIndex) }, span("beats"));
    		const measureInSecondsButton: HTMLButtonElement = button({ style: "font-size: 85%; width: 70px; height: 25px;", class: "last-button no-underline", onclick: () => this._switchMeasurementType(false, envelopeIndex) }, span("seconds"));
    		const measurementTypeColumn: HTMLElement = div({class: "selectRow", style: "display: grid; grid: repeat(3, 24px) / auto-flow; width: 50px; margin-top: 20px;"},
				span({ style: "height: 1em; width: 30px; margin-left: 15px; font-size: 11px; text-align: center;", class: "tip", onclick: () => this._openPrompt("envelopeDelayPhaseMeasurement") }, span("Measurement:")), 
				div({ class: "instrument-bar", style: "margin-left: 4.5px;" }, measureInBeatsButton, measureInSecondsButton)
			);
			const positioningSettingRow: HTMLElement = div({class: "selectRow dropFader", style: "width: 192px; height: 20px; margin-bottom: 49px; margin-top: 2px;"}, envelopeDelayColumn, envelopePhaseColumn, measurementTypeColumn, div({/* Artificial Fourth Column */}));
			const clapMirrorAmountSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 1, max: Config.clapMirrorsMax, value: "5", step: "1"});
			const clapMirrorAmountInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "clapMirrorAmountInputBox", type: "number", step: "1", min: 1, max: Config.clapMirrorsMax, value: "5"});
			const clapMirrorAmountRow: HTMLElement = div({class: "selectRow dropFader", style: "margin-top: 6px; margin-bottom: -3px;"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("mirrorAmount")}, span("‣ Mirrors:")),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, clapMirrorAmountInputBox),
			), clapMirrorAmountSlider);
			const alternateRangeToggle: HTMLInputElement = input({style: "width: 1em; padding: 0; flex: 3; transform: scale(1.6);", type: "checkbox"});
			const LFOShapeSelect: HTMLSelectElement = buildOptions(select(), [
				"sine (tremolo)",
				"triangle",
				"pulses",
				"sawtooth",
				"trapezoid",
				"stairs 1",
				"stairs 2",
				"tri-stairs",
				"absine"
			]);
			const LFOShapeRow: HTMLElement = div({class: "selectRow"}, span({ class: "tip", onclick: () => this._openPrompt("LFOShape") }, span("‣ Shape:")), div({ class: "selectContainer" }, LFOShapeSelect));
			const LFOEnableAccelerationToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const LFOLoopOnceToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const LFOIgnoranceToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const LFORadioButtonsRow: HTMLElement = div({}, div({class: "", style: "display: flex; flex-direction: row; justify-content: space-evenly; margin-bottom: 2px;"},
				div({style: "display: flex; flex-direction: column; gap: 5px; text-align: center;"},
					span({class: "tip", style: "font-size: 10px; height: 1em; width: 5em;", onclick: () => this._openPrompt("LFOAcceleration")}, span("Accelerate:")),
					div({style: ""}, LFOEnableAccelerationToggle),
				),
				div({style: "display: flex; flex-direction: column; gap: 5px; text-align: center;"},
					span({class: "tip", style: "font-size: 10.5px; height: 1em; width: 5em; white-space: nowrap;", onclick: () => this._openPrompt("LFOLoopOnce")}, span("Play Once:")),
					div({style: ""}, LFOLoopOnceToggle),
				),
				div({style: "display: flex; flex-direction: column; gap: 5px; text-align: center;"},
					span({class: "tip", style: "font-size: 10.5px; height: 1em; width: 5em;", onclick: () => this._openPrompt("LFOIgnorance")}, span("Ignorant:")),
					div({style: ""}, LFOIgnoranceToggle),
				),
			));
			const LFOAccelerationSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.LFOAccelerationMin, max: Config.LFOAccelerationMax, value: "1", step: "0.25"});
			const LFOAccelerationInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "LFOAccelerationInputBox", type: "number", step: "0.01", min: Config.LFOAccelerationMin, max: Config.LFOAccelerationMax, value: "1"});
			const LFOAccelerationRow: HTMLElement = div({class: "selectRow dropFader", style: "margin-bottom: 4px;"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 10px;", onclick: () => this._openPrompt("LFOAcceleration")}, span("‣ Acceleration:")),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, LFOAccelerationInputBox),
			), LFOAccelerationSlider);
			const LFOPulseWidthSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 0, max: "20", value: "4", step: "1"});
			const LFOPulseWidthRow: HTMLElement = div({class: "selectRow dropFader"}, span({ class: "tip", onclick: () => this._openPrompt("LFOPulseWidth") }, span("‣ Width:")), LFOPulseWidthSlider);
			const LFOTrapezoidRatioSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.LFOTrapezoidRatioMin, max: Config.LFOTrapezoidRatioMax, value: "1", step: "0.1"});
			const LFOTrapezoidRatioRow: HTMLElement = div({class: "selectRow dropFader"}, span({ class: "tip", onclick: () => this._openPrompt("LFOTrapezoidRatio") }, span("‣ Ratio:")), LFOTrapezoidRatioSlider);
			const LFOStairsStepAmountSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 1, max: Config.LFOStairsStepAmountMax, value: "4", step: "1"});
			const LFOStairsStepAmountInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "LFOStairsStepAmountInputBox", type: "number", step: "1", min: 1, max: Config.LFOStairsStepAmountMax, value: "4"});
			const LFOStairsStepAmountRow: HTMLElement = div({class: "selectRow dropFader", style: "margin-bottom: 4px;"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("LFOStepAmount")}, span("‣ Steps:")),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, LFOStairsStepAmountInputBox),
			), LFOStairsStepAmountSlider);
			const envelopeCopyButton: HTMLButtonElement = button({class: "envelope-button", title: "Copy", style: "flex: 3;", onclick: () => this._copyEnvelopeSettings(envelopeIndex)}, 
				// Copy icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 4%; top: 40%; margin-top: -0.75em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
					SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
				]),
			);
			const envelopePasteButton: HTMLButtonElement = button({class: "envelope-button", title: "Paste", style: "flex: 3;", onclick: () => this._pasteEnvelopeSettings(envelopeIndex)}, 
				// Paste icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 2%; top: 38%; margin-top: -0.75em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
					SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
					SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor" }),
				]),
			);
			const randomEnvelopeButton: HTMLButtonElement = button({class: "envelope-button", title: "Randomize Envelope", style: "flex: 3;", onclick: () => this._randomizeEnvelope(envelopeIndex)}, 
				// Dice icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 5px; top: 21%; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16"}, [
					SVG.path({ d: "M13 1a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2zM3 0a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V3a3 3 0 00-3-3zM5.5 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m0 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m-8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m4-4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0", fill: "currentColor"}),
				]),
			);
			const envelopeMoveUpButton: HTMLButtonElement = button({class: "envelope-button", title: "Move Envelope Up", style: "flex: 3;"}, 
				// Up-arrow icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: -43%; top: 40%; margin-top: -0.75em; pointer-events: none;", width: "2.4em", height: "2.4em", viewBox: "0 0 3 9" }, [
					SVG.path({ d: "M 2 3 L 4 1 L 6 3 L 4.5 3 L 4.5 6.5 L 3.5 6.5 L 3.5 3 L 2 3 z", fill: "currentColor" }),
				]),
			);
			const envelopeMoveDownButton: HTMLButtonElement = button({class: "envelope-button", title: "Move Envelope Down", style: "flex: 3;"}, 
				// Down-arrow icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: -45%; top: 35%; margin-top: -0.75em; pointer-events: none;", width: "2.4em", height: "2.4em", viewBox: "0 0 3 9" }, [
					SVG.path({ d: "M 6 5 L 4 7 L 2 5 L 3.5 5 L 3.5 1.5 L 4.5 1.5 L 4.5 5 L 6 5 z", fill: "currentColor"}),
				]),
			);
			const pitchEnvAutoBoundButton: HTMLButtonElement = button({class: "envelope-button", title: "Set Start/End to Highest/Lowest Notes", style: "flex: 3;", onclick: () => this._doc.selection.pitchEnvAutoBind(envelopeIndex, instrument)}, 
				// Horizontal extension icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 5px; top: 21%; pointer-events: none;", width: "3.5em", height: "3.5em", viewBox: "6 6 24 24"}, [
					SVG.path({ d: "M 6 6 L 14 6 L 14 7 L 6 7 L 6 6 M 6 14 L 14 14 L 14 13 L 6 13 L 6 14 M 10 7 L 8.5 8.5 L 9.4 8.5 L 9.4 11.5 L 8.4 11.5 L 10 13 L 11.5 11.5 L 10.6 11.5 L 10.6 8.5 L 11.5 8.5 L 10 7", fill: "currentColor"}),
				]),
			);
			const customEnvelopePromptButton: HTMLButtonElement = button({class: "envelope-button", title: "Edit Custom Envelope", style: "flex: 3;", onclick: () => this._openPrompt("customEnvelopePrompt", envelopeIndex, false)}, 
				// Pencil icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 4px; top: 19%; pointer-events: none;", width: "4em", height: "4em", viewBox: "6 6 24 24"}, [
					SVG.path({ d: "M12 6 11.8 6.2 13.8 8.2 14 8C14 6.8 13.2 6 12 6M11.5 6.5 11.8 6.8 7.5 11 7.8 11 7.8 11.3 8.1 11.3 8.1 11.6 8.4 11.6 8.4 11.9 8.7 11.9 8.7 12.2 9 12.2 9 12.5 13 8.5 11.5 7 11.8 6.8 13.5 8.5 9 13 7 11 11.5 6.5M7 11 7 13 9 13", fill: "currentColor"}),
				]),
			);
			const envelopeDropdownGroup: HTMLElement = div({class: "editor-controls", style: "display: none;"}, envelopePlotterRow1, envelopePlotterRow2, pitchEnvelopeSettingRow, LFOShapeRow, LFORadioButtonsRow, LFOAccelerationRow, LFOPulseWidthRow, LFOTrapezoidRatioRow, LFOStairsStepAmountRow, primaryEnvelopeSettingRow, clapMirrorAmountRow, positioningSettingRow);
			const envelopeDropdown: HTMLButtonElement = button({style: "margin-left: 0.6em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.PerEnvelope, envelopeIndex)}, "▼");

			const targetSelect: HTMLSelectElement = select();
			for (let target: number = 0; target < Config.instrumentAutomationTargets.length; target++) {
				const interleaved: boolean = (Config.instrumentAutomationTargets[target].interleave);
				for (let index: number = 0; index < Config.instrumentAutomationTargets[target].maxCount; index++) {
					targetSelect.appendChild(this._makeOption(target, index));
					if (interleaved) {
						targetSelect.appendChild(this._makeOption(target + 1, index));
					}
				}
				if (interleaved) target++;
			}
			
			const envelopeSelect: HTMLSelectElement = select();
			for (let envelope: number = 0; envelope < Config.envelopes.length; envelope++) {
				envelopeSelect.appendChild(option({value: envelope}, Config.envelopes[envelope].name));
			} 
			
			const deleteButton: HTMLButtonElement = button({type: "button", class: "delete-envelope", title: "Remove Envelope"});

			const row: HTMLDivElement = div(
				div({style: "width: 0; position: absolute; margin-top: 19px;"}, envelopeDropdown),
				div({class: "envelope-row", style: "width: 90%; margin-left: 10%; margin-bottom: -2px;"},
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopeMoveUpButton),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopeCopyButton),
					div({class: "selectContainer", style: "width: 0; flex: 3;"}, targetSelect),
					div({style: "position: absolute; margin-top: 3px; margin-left: 121.5px;"}, alternateRangeToggle),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, deleteButton),
				), 
				div({class: "envelope-row", style: "width: 90%; margin-left: 10%;"},
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopeMoveDownButton),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopePasteButton),
					div({class: "selectContainer", style: "width: 0; flex: 3;"}, envelopeSelect),
					div({style: "position: absolute; margin-top: 0px; margin-left: 119px;"}, pitchEnvAutoBoundButton),
					div({style: "position: absolute; margin-top: 0px; margin-left: 119px;"}, customEnvelopePromptButton),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, randomEnvelopeButton),
				),
			envelopeDropdownGroup);
			
			this.container.appendChild(row);
			this._rows[envelopeIndex] = row;
			this._plotterLowerTimeRangeInputs[envelopeIndex] = plotterLowerTimeRangeInput;
			this._plotterUpperTimeRangeInputs[envelopeIndex] = plotterUpperTimeRangeInput;
			this._plotterLowerHeightInputs[envelopeIndex] = plotterLowerHeightInput;
			this._plotterUpperHeightInputs[envelopeIndex] = plotterUpperHeightInput;
			this._envelopePlotters[envelopeIndex] = envelopePlotter;
			this._envelopePlotterRow1s[envelopeIndex] = envelopePlotterRow1;
			this._envelopePlotterRow2s[envelopeIndex] = envelopePlotterRow2;
			this._perEnvelopeSpeedKnobs[envelopeIndex] = perEnvelopeSpeedKnob;
			this._perEnvelopeSpeedInputBoxes[envelopeIndex] = perEnvelopeSpeedInputBox;
			this._perEnvelopeSpeedColumns[envelopeIndex] = perEnvelopeSpeedColumn;
			this._discreteEnvelopeToggles[envelopeIndex] = discreteEnvelopeToggle;
			this._discreteEnvelopeColumns[envelopeIndex] = discreteEnvelopeColumn;
			this._lowerBoundKnobs[envelopeIndex] = lowerBoundKnob;
			this._upperBoundKnobs[envelopeIndex] = upperBoundKnob;
			this._lowerBoundInputBoxes[envelopeIndex] = lowerBoundInputBox;
			this._upperBoundInputBoxes[envelopeIndex] = upperBoundInputBox;
			this._lowerBoundColumns[envelopeIndex] = lowerBoundColumn;
			this._upperBoundColumns[envelopeIndex] = upperBoundColumn;
			this._primaryEnvelopeSettingRows[envelopeIndex] = primaryEnvelopeSettingRow;
			this._envelopeDelayKnobs[envelopeIndex] = envelopeDelayKnob;
			this._envelopeDelayInputBoxes[envelopeIndex] = envelopeDelayInputBox;
			this._envelopeDelayColumns[envelopeIndex] = envelopeDelayColumn;
			this._pitchStartKnobs[envelopeIndex] = pitchStartKnob;
			this._pitchStartInputBoxes[envelopeIndex] = pitchStartInputBox;
			this._pitchStartNoteTexts[envelopeIndex] = pitchStartNoteText;
			this._pitchEndKnobs[envelopeIndex] = pitchEndKnob;
			this._pitchEndInputBoxes[envelopeIndex] = pitchEndInputBox;
			this._pitchEndNoteTexts[envelopeIndex] = pitchEndNoteText;
			this._pitchStartGroups[envelopeIndex] = pitchStartGroup;
			this._pitchEndGroups[envelopeIndex] = pitchEndGroup;
			this._pitchAmplifyToggles[envelopeIndex] = pitchAmplifyToggle;
			this._pitchBounceToggles[envelopeIndex] = pitchBounceToggle;
			this._pitchEnvelopeSettingRows[envelopeIndex] = pitchEnvelopeSettingRow;
			this._envelopePhaseKnobs[envelopeIndex] = envelopePhaseKnob;
			this._envelopePhaseInputBoxes[envelopeIndex] = envelopePhaseInputBox;
			this._envelopePhaseColumns[envelopeIndex] = envelopePhaseColumn;
			this._measureInBeatButtons[envelopeIndex] = measureInBeatsButton;
			this._measureInSecondButtons[envelopeIndex] = measureInSecondsButton;
			this._measurementTypeColumns[envelopeIndex] = measurementTypeColumn;
			this._positioningSettingRows[envelopeIndex] = positioningSettingRow;
			this._clapMirrorAmountSliders[envelopeIndex] = clapMirrorAmountSlider;
			this._clapMirrorAmountInputBoxes[envelopeIndex] = clapMirrorAmountInputBox;
			this._clapMirrorAmountRows[envelopeIndex] = clapMirrorAmountRow;
			this._envelopeCopyButtons[envelopeIndex] = envelopeCopyButton;
			this._envelopePasteButtons[envelopeIndex] = envelopePasteButton;
			this._randomEnvelopeButtons[envelopeIndex] = randomEnvelopeButton;
			this._envelopeMoveUpButtons[envelopeIndex] = envelopeMoveUpButton;
			this._envelopeMoveDownButtons[envelopeIndex] = envelopeMoveDownButton;
			this._pitchEnvAutoBoundButtons[envelopeIndex] = pitchEnvAutoBoundButton;
			this._customEnvelopePromptButtons[envelopeIndex] = customEnvelopePromptButton;
			this._alternateRangeToggles[envelopeIndex] = alternateRangeToggle;
			this._LFOShapeSelects[envelopeIndex] = LFOShapeSelect;
			this._LFOShapeRows[envelopeIndex] = LFOShapeRow;
			this._LFOEnableAccelerationToggles[envelopeIndex] = LFOEnableAccelerationToggle;
			this._LFOLoopOnceToggles[envelopeIndex] = LFOLoopOnceToggle;
			this._LFOIgnoranceToggles[envelopeIndex] = LFOIgnoranceToggle;
			this._LFORadioButtonRows[envelopeIndex] = LFORadioButtonsRow;
			this._LFOAccelerationSliders[envelopeIndex] = LFOAccelerationSlider;
			this._LFOAccelerationInputBoxes[envelopeIndex] = LFOAccelerationInputBox;
			this._LFOAccelerationRows[envelopeIndex] = LFOAccelerationRow;
			this._LFOPulseWidthSliders[envelopeIndex] = LFOPulseWidthSlider;
			this._LFOPulseWidthRows[envelopeIndex] = LFOPulseWidthRow;
			this._LFOTrapezoidRatioSliders[envelopeIndex] = LFOTrapezoidRatioSlider;
			this._LFOTrapezoidRatioRows[envelopeIndex] = LFOTrapezoidRatioRow;
			this._LFOStairsStepAmountSliders[envelopeIndex] = LFOStairsStepAmountSlider;
			this._LFOStairsStepAmountInputBoxes[envelopeIndex] = LFOStairsStepAmountInputBox;
			this._LFOStairsStepAmountRows[envelopeIndex] = LFOStairsStepAmountRow;
			this._envelopeDropdownGroups[envelopeIndex] = envelopeDropdownGroup;
			this._envelopeDropdowns[envelopeIndex] = envelopeDropdown;
			this._targetSelects[envelopeIndex] = targetSelect;
			this._envelopeSelects[envelopeIndex] = envelopeSelect;
			this._deleteButtons[envelopeIndex] = deleteButton;
		}
		
		for (let envelopeIndex: number = this._renderedEnvelopeCount; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			this._rows[envelopeIndex].style.display = "";
			// For newly visible rows, update target option visibiliy.
			this._updateTargetOptionVisibility(this._targetSelects[envelopeIndex], instrument);
		}
		
		for (let envelopeIndex: number = instrument.envelopeCount; envelopeIndex < this._renderedEnvelopeCount; envelopeIndex++) {
			this._rows[envelopeIndex].style.display = "none";
		}

		let useControlPointCount: number = instrument.noteFilter.controlPointCount;
		if (instrument.noteFilterType) useControlPointCount = 1;
		
		if (this._renderedEqFilterCount != instrument.eqFilter.controlPointCount ||
			this._renderedNoteFilterCount != useControlPointCount ||
			this._renderedInstrumentType != instrument.type ||
			this._renderedEffects != instrument.effects)
		{
			// Update target option visibility for previously visible rows.
			for (let envelopeIndex: number = 0; envelopeIndex < this._renderedEnvelopeCount; envelopeIndex++) {
				this._updateTargetOptionVisibility(this._targetSelects[envelopeIndex], instrument);
			}
		}
		// Specifically for FM pulse width envelope targets.
		for (let i = 0; i < Config.operatorCount+2; i++) {
			if (this._renderedFMOperatorWaveforms[i] != instrument.operators[i].waveform) {
				// Update target option visibility for previously visible rows.
				for (let envelopeIndex: number = 0; envelopeIndex < this._renderedEnvelopeCount; envelopeIndex++) {
					this._updateTargetOptionVisibility(this._targetSelects[envelopeIndex], instrument);
				}
			}
		}
		
		for (let envIdx: number = 0; envIdx < instrument.envelopeCount; envIdx++) {
			const instEnv = instrument.envelopes[envIdx];
			this._plotterLowerTimeRangeInputs[envIdx].value = String(clamp(0, 250.99, this._envelopePlotters[envIdx].lowerRange));
			this._plotterUpperTimeRangeInputs[envIdx].value = String(clamp(0.01, 251, this._envelopePlotters[envIdx].upperRange));
			this._plotterLowerHeightInputs[envIdx].value = String(clamp(0, 16.99, this._envelopePlotters[envIdx].lowerHeight));
			this._plotterUpperHeightInputs[envIdx].value = String(clamp(0.01, 17, this._envelopePlotters[envIdx].upperHeight));
			this._envelopePlotters[envIdx].render();
			this._perEnvelopeSpeedKnobs[envIdx].updateValue(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instEnv.envelopeSpeed));
			this._perEnvelopeSpeedInputBoxes[envIdx].value = String(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instEnv.envelopeSpeed));
			this._discreteEnvelopeToggles[envIdx].checked = instEnv.discrete ? true : false;
			this._lowerBoundKnobs[envIdx].updateValue(clamp(Config.lowerBoundMin, Config.lowerBoundMax+1, instEnv.lowerBound));
			this._upperBoundKnobs[envIdx].updateValue(clamp(Config.upperBoundMin, Config.upperBoundMax+1, instEnv.upperBound));
			this._lowerBoundInputBoxes[envIdx].value = String(clamp(Config.lowerBoundMin, Config.lowerBoundMax+1, instEnv.lowerBound));
			this._upperBoundInputBoxes[envIdx].value = String(clamp(Config.upperBoundMin, Config.upperBoundMax+1, instEnv.upperBound));
			this._envelopeDelayKnobs[envIdx].updateValue(clamp(0, Config.envelopeDelayMax+1, instEnv.delay));
			this._envelopeDelayInputBoxes[envIdx].value = String(clamp(0, Config.envelopeDelayMax+1, instEnv.delay));
			// Reset min/max for pitch envelope UI elements before resetting value.
			this._pitchStartKnobs[envIdx].knobMinValue = (drumPitchEnvBoolean ? 1 : 0);
			this._pitchStartKnobs[envIdx].knobMaxValue = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch);
			this._pitchStartInputBoxes[envIdx].min = (drumPitchEnvBoolean ? 1 : 0).toString();
			this._pitchStartInputBoxes[envIdx].max = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch).toString();
			this._pitchEndKnobs[envIdx].knobMinValue = (drumPitchEnvBoolean ? 1 : 0);
			this._pitchEndKnobs[envIdx].knobMaxValue = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch);
			this._pitchEndInputBoxes[envIdx].min = (drumPitchEnvBoolean ? 1 : 0).toString();
			this._pitchEndInputBoxes[envIdx].max = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch).toString();
			this._pitchStartKnobs[envIdx].updateValue(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchStart));
			this._pitchStartInputBoxes[envIdx].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchStart));
			this._pitchStartNoteTexts[envIdx].textContent = String("Start " + this._pitchToNote(parseInt(this._pitchStartInputBoxes[envIdx].value), drumPitchEnvBoolean) + ":");
			this._pitchEndKnobs[envIdx].updateValue(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchEnd));
			this._pitchEndInputBoxes[envIdx].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchEnd));
			this._pitchEndNoteTexts[envIdx].textContent = String("End " + this._pitchToNote(parseInt(this._pitchEndInputBoxes[envIdx].value), drumPitchEnvBoolean) + ":");
			this._pitchAmplifyToggles[envIdx].checked = instEnv.pitchAmplify ? true : false;
			this._pitchBounceToggles[envIdx].checked = instEnv.pitchBounce ? true : false;
			this._envelopePhaseKnobs[envIdx].updateValue(clamp(0, Config.envelopePhaseMax+1, instEnv.phase));
			this._envelopePhaseInputBoxes[envIdx].value = String(clamp(0, Config.envelopePhaseMax+1, instEnv.phase));
			if (instEnv.measurementType) {
				this._measureInBeatButtons[envIdx].classList.remove("deactivated");
				this._measureInSecondButtons[envIdx].classList.add("deactivated");
			} else {
				this._measureInBeatButtons[envIdx].classList.add("deactivated");
				this._measureInSecondButtons[envIdx].classList.remove("deactivated");
			}
			this._clapMirrorAmountSliders[envIdx].value = String(clamp(1, Config.clapMirrorsMax+1, instEnv.mirrorAmount));
			this._clapMirrorAmountInputBoxes[envIdx].value = String(clamp(1, Config.clapMirrorsMax+1, instEnv.mirrorAmount));
			this._alternateRangeToggles[envIdx].checked = instEnv.alternateRange ? true : false;
			this._LFOShapeSelects[envIdx].selectedIndex = instEnv.LFOSettings.LFOShape;
			this._LFOEnableAccelerationToggles[envIdx].checked = instEnv.LFOSettings.LFOActiveCheckbox == 1 ? true : false;
			this._LFOLoopOnceToggles[envIdx].checked = instEnv.LFOSettings.LFOActiveCheckbox == 2 ? true : false;
			this._LFOIgnoranceToggles[envIdx].checked = instEnv.LFOSettings.LFOActiveCheckbox == 3 ? true : false;
			this._LFOAccelerationSliders[envIdx].value = String(clamp(Config.LFOAccelerationMin, Config.LFOAccelerationMax+1, instEnv.LFOSettings.LFOAcceleration));
			this._LFOAccelerationInputBoxes[envIdx].value = String(clamp(Config.LFOAccelerationMin, Config.LFOAccelerationMax+1, instEnv.LFOSettings.LFOAcceleration));
			this._LFOPulseWidthSliders[envIdx].value = String(clamp(0, 21, instEnv.LFOSettings.LFOPulseWidth));
			this._LFOTrapezoidRatioSliders[envIdx].value = String(clamp(Config.LFOTrapezoidRatioMin, Config.LFOTrapezoidRatioMax+1, instEnv.LFOSettings.LFOTrapezoidRatio));
			this._LFOStairsStepAmountSliders[envIdx].value = String(clamp(1, Config.LFOStairsStepAmountMax+1, instEnv.LFOSettings.LFOStepAmount));
			this._LFOStairsStepAmountInputBoxes[envIdx].value = String(clamp(1, Config.LFOStairsStepAmountMax+1, instEnv.LFOSettings.LFOStepAmount));
			this._envelopeMoveUpButtons[envIdx].disabled = !(this._doc.prefs.showEnvReorderButtons);
			this._envelopeMoveDownButtons[envIdx].disabled = !(this._doc.prefs.showEnvReorderButtons);
			this._pitchEnvAutoBoundButtons[envIdx].disabled = !(instEnv.envelope == Config.envelopes.dictionary["pitch"].index);
			this._pitchEnvAutoBoundButtons[envIdx].style.zIndex = instEnv.envelope == Config.envelopes.dictionary["pitch"].index ? "1" : "0";
			this._customEnvelopePromptButtons[envIdx].disabled = !(instEnv.envelope == Config.envelopes.dictionary["custom"].index);
			this._customEnvelopePromptButtons[envIdx].style.zIndex = instEnv.envelope == Config.envelopes.dictionary["custom"].index ? "1" : "0";
			this._targetSelects[envIdx].value = String(instEnv.target + instEnv.index * Config.instrumentAutomationTargets.length);
			this._envelopeSelects[envIdx].selectedIndex = instEnv.envelope;
			this._targetSelects[envIdx].style.minWidth = (this._doc.prefs.showEnvReorderButtons || (instEnv.target == Config.instrumentAutomationTargets.dictionary["unison"].index || instEnv.target == Config.instrumentAutomationTargets.dictionary["pitchShift"].index || instEnv.target == Config.instrumentAutomationTargets.dictionary["detune"].index /*||instEnv.target == Config.instrumentAutomationTargets.dictionary["panning"].index*/)) ? "" : "116px";
			this._targetSelects[envIdx].style.maxWidth = (instEnv.target == Config.instrumentAutomationTargets.dictionary["unison"].index || instEnv.target == Config.instrumentAutomationTargets.dictionary["pitchShift"].index || instEnv.target == Config.instrumentAutomationTargets.dictionary["detune"].index /*||instEnv.target == Config.instrumentAutomationTargets.dictionary["panning"].index*/) ? this._doc.prefs.showEnvReorderButtons ? "61px" : "88px" : "";
			this._targetSelects[envIdx].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			this._envelopeCopyButtons[envIdx].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			this._envelopeSelects[envIdx].style.minWidth = (this._doc.prefs.showEnvReorderButtons || (instEnv.envelope == Config.envelopes.dictionary["pitch"].index || instEnv.envelope == Config.envelopes.dictionary["custom"].index)) ? "" : "116px";
			this._envelopeSelects[envIdx].style.maxWidth = (instEnv.envelope == Config.envelopes.dictionary["pitch"].index || instEnv.envelope == Config.envelopes.dictionary["custom"].index) ? this._doc.prefs.showEnvReorderButtons ? "61px" : "88px" : "";
			this._envelopeSelects[envIdx].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			this._envelopePasteButtons[envIdx].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			
			if ( // Special case on envelope plotters
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._envelopePlotterRow1s[envIdx].style.display = "none";
				this._envelopePlotterRow2s[envIdx].style.display = "none";
			} else {
				this._envelopePlotterRow1s[envIdx].style.display = "";
				this._envelopePlotterRow2s[envIdx].style.display = "";
			}

			if ( // Special case on IES
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._perEnvelopeSpeedColumns[envIdx].style.display = "none";
			} else {
				this._perEnvelopeSpeedColumns[envIdx].style.display = "grid";
			}

			if ( // Spacing on primary settings.
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index
			) {
				this._primaryEnvelopeSettingRows[envIdx].style.marginBottom = "49px";
				if (instEnv.envelope == Config.envelopes.dictionary["none"].index) {
					this._lowerBoundColumns[envIdx].style.display = "none";
					this._discreteEnvelopeColumns[envIdx].style.display = "none";
					this._upperBoundColumns[envIdx].style.marginLeft = "75px";
				} else { 
					this._lowerBoundColumns[envIdx].style.display = "grid";
					this._discreteEnvelopeColumns[envIdx].style.display = "grid";
					this._upperBoundColumns[envIdx].style.marginLeft = "0px";
				}
			} else { 
				this._primaryEnvelopeSettingRows[envIdx].style.marginBottom = "42px";
				this._lowerBoundColumns[envIdx].style.display = "grid";
				this._discreteEnvelopeColumns[envIdx].style.display = "grid";
				this._upperBoundColumns[envIdx].style.marginLeft = "0px";
			}

			if ( // Special case on mirror amount.
				instEnv.envelope == Config.envelopes.dictionary["dogebox2 clap"].index
			) {
				this._clapMirrorAmountRows[envIdx].style.display = "";
			} else {
				this._clapMirrorAmountRows[envIdx].style.display = "none";
			}

			if ( // Special case on delay and phase.
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._positioningSettingRows[envIdx].style.display = "none";
			} else {
				this._positioningSettingRows[envIdx].style.display = "";
			}

			if ( // Pitch settings are special-cased to the pitch envelope.
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._pitchEnvelopeSettingRows[envIdx].style.display = "";
			} else {
				this._pitchEnvelopeSettingRows[envIdx].style.display = "none";
			}

			if ( // Special case on alternate range toggles.
				instEnv.target == Config.instrumentAutomationTargets.dictionary["unison"].index ||
            	instEnv.target == Config.instrumentAutomationTargets.dictionary["pitchShift"].index ||
            	instEnv.target == Config.instrumentAutomationTargets.dictionary["detune"].index /*||
            	instEnv.target == Config.instrumentAutomationTargets.dictionary["panning"].index */
			) {
				this._alternateRangeToggles[envIdx].style.display = "";
			} else {
				this._alternateRangeToggles[envIdx].style.display = "none";
			}

			if ( // LFO settings are special-cased to the LFO envelope.
				instEnv.envelope == Config.envelopes.dictionary["LFO"].index
			) {
				this._LFOShapeRows[envIdx].style.display = "";
				this._LFORadioButtonRows[envIdx].style.display = "";
				// Acceleration rows are only viewable when their radio button is selected.
				if (instEnv.LFOSettings.LFOActiveCheckbox == 1) {
					this._LFOAccelerationRows[envIdx].style.display = "";
				} else {
					this._LFOAccelerationRows[envIdx].style.display = "none";
				}
				// Pulse width is special-cased to the "pulses" LFO shape.
				if (instEnv.LFOSettings.LFOShape == LFOShapes.Pulses) { 
					this._LFOPulseWidthRows[envIdx].style.display = "";
				} else {
					this._LFOPulseWidthRows[envIdx].style.display = "none";
				}
				// Trapezoid ratio is special-cased to the "trapezoid" LFO shape.
				if (instEnv.LFOSettings.LFOShape == LFOShapes.Trapezoid) { 
					this._LFOTrapezoidRatioRows[envIdx].style.display = "";
				} else {
					this._LFOTrapezoidRatioRows[envIdx].style.display = "none";
				}
				// Step amount is special-cased to any stair-like LFO shape.
				if (
					instEnv.LFOSettings.LFOShape == LFOShapes.Stairs ||
					instEnv.LFOSettings.LFOShape == LFOShapes.Stairs2 ||
					instEnv.LFOSettings.LFOShape == LFOShapes.TriStairs 
				) { 
					this._LFOStairsStepAmountRows[envIdx].style.display = "";
				} else {
					this._LFOStairsStepAmountRows[envIdx].style.display = "none";
				}
			} else {
				this._LFOShapeRows[envIdx].style.display = "none";
				this._LFORadioButtonRows[envIdx].style.display = "none";
				this._LFOAccelerationRows[envIdx].style.display = "none";
				this._LFOPulseWidthRows[envIdx].style.display = "none";
				this._LFOTrapezoidRatioRows[envIdx].style.display = "none";
				this._LFOStairsStepAmountRows[envIdx].style.display = "none";
			}
		}
		
		this._renderedEnvelopeCount = instrument.envelopeCount;
		this._renderedEqFilterCount = instrument.eqFilter.controlPointCount;
		this._renderedNoteFilterCount = useControlPointCount;
		this._renderedInstrumentType = instrument.type;
		this._renderedEffects = instrument.effects;
		for (let i = 0; i < Config.operatorCount+2; i++) {
			this._renderedFMOperatorWaveforms[i] = instrument.operators[i].waveform;
		}
	}

	private _switchMeasurementType(type: boolean, index: number) {
		const measurementType = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].envelopes[index].measurementType;
		this._doc.record(new ChangeMeasurementType(this._doc, index, measurementType, type));
    }

	private _copyEnvelopeSettings(copiedIndex: number): void {
		let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let envelope = instrument.envelopes[copiedIndex];
		const envelopeCopy: any = envelope.toJsonObject(instrument);
		window.localStorage.setItem("envelopeCopy", JSON.stringify(envelopeCopy));
	}

	private _pasteEnvelopeSettings(pasteIndex: number): void {
		let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const storedEnvelope: any = JSON.parse(String(window.localStorage.getItem("envelopeCopy")));
		this._doc.record(new ChangePasteEnvelope(this._doc, instrument, instrument.envelopes[pasteIndex], storedEnvelope));
	}

	private _randomizeEnvelope(envelopeIndex: number): void {
		let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		this._doc.record(new RandomEnvelope(this._doc, envelopeIndex, instrument));
	}

	private _toggleDropdownMenu(dropdown: DropdownID, submenu: number = 0): void {
        let target: HTMLButtonElement = this._envelopeDropdowns[submenu];
        let group: HTMLElement = this._envelopeDropdownGroups[submenu];
        switch (dropdown) {
            case DropdownID.Envelope:
                target = this._envelopeDropdowns[submenu];
                this._openPerEnvelopeDropdowns[submenu] = this._openPerEnvelopeDropdowns[submenu] ? false : true;
                group = this._envelopeDropdownGroups[submenu];
                break;
        }

        if (target.textContent == "▼") {
            target.textContent = "▲";
			group.style.display = "";
            for (let i: number = 0; i < group.children.length; i++) {
                // A timeout is needed so that the previous 0s, 0 opacity settings can be applied. They're not done until the group is visible again because display: none prunes animation steps.
                setTimeout(() => {
                    (group.children[i] as HTMLElement).style.animationDelay = '0.17s';
                    (group.children[i] as HTMLElement).style.opacity = '1';}
                );
            }
        } else {
            for (let i: number = 0; i < group.children.length; i++) {
                (group.children[i] as HTMLElement).style.animationDelay = '0s';
                (group.children[i] as HTMLElement).style.opacity = '0';
            }
            target.textContent = "▼";
            group.style.display = "none";
        }
    }
}
