// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Scale, Config} from "../synth/SynthConfig";

export class Preferences {
	public static readonly defaultVisibleOctaves: number = 3;
	
	public autoPlay: boolean;
	public autoFollow: boolean;
	public enableNotePreview: boolean;
	public showFifth: boolean;
	public notesOutsideScale: boolean;
	public defaultScale: number;
	public showLetters: boolean;
	public showChannels: boolean;
	public showScrollBar: boolean;
	public alwaysFineNoteVol: boolean;
	public displayVolumeBar: boolean;
	public instrumentCopyPaste: boolean;
	public enableChannelMuting: boolean;
	public colorTheme: string;
	public layout: string;
	public displayBrowserUrl: boolean;
	public volume: number = 75;
	public oscilloscopeScale: number = 1;
	public visibleOctaves: number = Preferences.defaultVisibleOctaves;
	public pressControlForShortcuts: boolean;
	public keyboardLayout: string;
	public bassOffset: number;
	public enableMidi: boolean;
	public showRecordButton: boolean;
	public snapRecordedNotesToRhythm: boolean;
	public ignorePerformedNotesNotInScale: boolean;
	public metronomeCountIn: boolean;
	public metronomeWhileRecording: boolean;
	public showOscilloscope: boolean;
	public showEnvReorderButtons: boolean;

	// Random Generation Setup
		public chipWaveOnRandomization: boolean;
		public PWMOnRandomization: boolean;
		public supersawOnRandomization: boolean;
		public harmonicsOnRandomization: boolean;
		public pickedStringOnRandomization: boolean;
		public spectrumOnRandomization: boolean;
		public FMOnRandomization: boolean;
		public ADVFMOnRandomization: boolean;
		public customChipOnRandomization: boolean;
		public noiseOnRandomization: boolean;
		public wavetableOnRandomization: boolean;
		public drumSpectrumOnRandomization: boolean;
		public drumNoiseOnRandomization: boolean;
		public drumsetOnRandomization: boolean;

	// Keybind Setup
		public deactivateCapsLock: boolean;
		public CTRLrEvent: string;
		public deactivateBKeybind: boolean;
	
	constructor() {
		this.reload();
	}
	
	public reload(): void {
		this.autoPlay = this._loadBoolean("autoPlay", false);
		this.autoFollow = this._loadBoolean("autoFollow", false);
		this.enableNotePreview = this._loadBoolean("enableNotePreview", true);
		this.showFifth = this._loadBoolean("showFifth", false);
		this.notesOutsideScale = this._loadBoolean("notesOutsideScale", false);
		this.showLetters = this._loadBoolean("showLetters", true);
		this.showChannels = this._loadBoolean("showChannels", false);
		this.showScrollBar = this._loadBoolean("showScrollBar", true);
		this.alwaysFineNoteVol = this._loadBoolean("alwaysFineNoteVol", false);
		this.displayVolumeBar = this._loadBoolean("displayVolumeBar", true);
		this.instrumentCopyPaste = this._loadBoolean("instrumentCopyPaste", true);
		this.enableChannelMuting = this._loadBoolean("enableChannelMuting", true);
		this.displayBrowserUrl = this._loadBoolean("displayBrowserUrl", true);
		this.pressControlForShortcuts = this._loadBoolean("pressControlForShortcuts", false);
		this.enableMidi = this._loadBoolean("enableMidi", false);
		this.showRecordButton = this._loadBoolean("showRecordButton", false);
		this.snapRecordedNotesToRhythm = this._loadBoolean("snapRecordedNotesToRhythm", true);
		this.ignorePerformedNotesNotInScale = this._loadBoolean("ignorePerformedNotesNotInScale", false);
		this.metronomeCountIn = this._loadBoolean("metronomeCountIn", true);
		this.metronomeWhileRecording = this._loadBoolean("metronomeWhileRecording", true);
		this.showOscilloscope = this._loadBoolean("showOscilloscope", false);
		this.showEnvReorderButtons = this._loadBoolean("showEnvReorderButtons", false);
		this.keyboardLayout = window.localStorage.getItem("keyboardLayout") || "wickiHayden";
		this.bassOffset = (+(<any>window.localStorage.getItem("bassOffset"))) || 0;
		this.layout = window.localStorage.getItem("layout") || "small";
		this.colorTheme = window.localStorage.getItem("colorTheme") || "midbox";
		this.visibleOctaves = ((<any>window.localStorage.getItem("visibleOctaves")) >>> 0) || Preferences.defaultVisibleOctaves;

		// Random Generation Setup
		this.chipWaveOnRandomization = this._loadBoolean("chipWaveOnRandomization", true);
		this.PWMOnRandomization = this._loadBoolean("PWMOnRandomization", true);
		this.supersawOnRandomization = this._loadBoolean("supersawOnRandomization", true);
		this.harmonicsOnRandomization = this._loadBoolean("harmonicsOnRandomization", true);
		this.pickedStringOnRandomization = this._loadBoolean("pickedStringOnRandomization", true);
		this.spectrumOnRandomization = this._loadBoolean("spectrumOnRandomization", true);
		this.FMOnRandomization = this._loadBoolean("FMOnRandomization", true);
		this.ADVFMOnRandomization = this._loadBoolean("ADVFMOnRandomization", true);
		this.customChipOnRandomization = this._loadBoolean("customChipOnRandomization", true);
		this.noiseOnRandomization = this._loadBoolean("noiseOnRandomization", true);
		this.wavetableOnRandomization = this._loadBoolean("wavetableOnRandomization", true);
		this.drumSpectrumOnRandomization = this._loadBoolean("drumSpectrumOnRandomization", true);
		this.drumNoiseOnRandomization = this._loadBoolean("drumNoiseOnRandomization", true);
		this.drumsetOnRandomization = this._loadBoolean("drumsetOnRandomization", true);
		
		// Keybind Setup
		this.deactivateCapsLock = this._loadBoolean("deactivateCapsLock", true);
		this.CTRLrEvent = window.localStorage.getItem("CTRLrEvent") || "ctrlRtoRandomGenPrompt";
		this.deactivateBKeybind = this._loadBoolean("deactivateBKeybind", true);
		

		const defaultScale: Scale | undefined = Config.scales.dictionary[window.localStorage.getItem("defaultScale")!];
		this.defaultScale = (defaultScale != undefined) ? defaultScale.index : 0;
		
		if (window.localStorage.getItem("volume") != null) {
			this.volume = Math.min(<any>window.localStorage.getItem("volume") >>> 0, 75);
		}

		if (window.localStorage.getItem("oscilloscopeScale") != null) {
			this.oscilloscopeScale = Math.min(Number(<any>window.localStorage.getItem("oscilloscopeScale")), 5);
		}
		
		if (window.localStorage.getItem("fullScreen") != null) {
			if (this._loadBoolean("fullScreen", false)) this.layout = "long";
			window.localStorage.removeItem("fullScreen");
		}
	}
	
	public save(): void {
		window.localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
		window.localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
		window.localStorage.setItem("enableNotePreview", this.enableNotePreview ? "true" : "false");
		window.localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
		window.localStorage.setItem("notesOutsideScale", this.notesOutsideScale ? "true" : "false");
		window.localStorage.setItem("defaultScale", Config.scales[this.defaultScale].name);
		window.localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
		window.localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
		window.localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
		window.localStorage.setItem("alwaysFineNoteVol", this.alwaysFineNoteVol ? "true" : "false");
		window.localStorage.setItem("displayVolumeBar", this.displayVolumeBar ? "true" : "false");
		window.localStorage.setItem("enableChannelMuting", this.enableChannelMuting ? "true" : "false");
		window.localStorage.setItem("instrumentCopyPaste", this.instrumentCopyPaste ? "true" : "false");
		window.localStorage.setItem("displayBrowserUrl", this.displayBrowserUrl ? "true" : "false");
		window.localStorage.setItem("pressControlForShortcuts", this.pressControlForShortcuts ? "true" : "false");
		window.localStorage.setItem("enableMidi", this.enableMidi ? "true" : "false");
		window.localStorage.setItem("showRecordButton", this.showRecordButton ? "true" : "false");
		window.localStorage.setItem("snapRecordedNotesToRhythm", this.snapRecordedNotesToRhythm ? "true" : "false");
		window.localStorage.setItem("ignorePerformedNotesNotInScale", this.ignorePerformedNotesNotInScale ? "true" : "false");
		window.localStorage.setItem("metronomeCountIn", this.metronomeCountIn ? "true" : "false");
		window.localStorage.setItem("metronomeWhileRecording", this.metronomeWhileRecording ? "true" : "false");
		window.localStorage.setItem("showOscilloscope", this.showOscilloscope ? "true" : "false");
		window.localStorage.setItem("showEnvReorderButtons", this.showEnvReorderButtons ? "true" : "false");
		window.localStorage.setItem("keyboardLayout", this.keyboardLayout);
		window.localStorage.setItem("bassOffset", String(this.bassOffset));
		window.localStorage.setItem("layout", this.layout);
		window.localStorage.setItem("colorTheme", this.colorTheme);
		window.localStorage.setItem("volume", String(this.volume));
		window.localStorage.setItem("oscilloscopeScale", String(this.oscilloscopeScale));
		window.localStorage.setItem("visibleOctaves", String(this.visibleOctaves));

		// Random Generation Setup
		window.localStorage.setItem("chipWaveOnRandomization", this.chipWaveOnRandomization ? "true" : "false");
		window.localStorage.setItem("PWMOnRandomization", this.PWMOnRandomization ? "true" : "false");
		window.localStorage.setItem("supersawOnRandomization", this.supersawOnRandomization ? "true" : "false");
		window.localStorage.setItem("harmonicsOnRandomization", this.harmonicsOnRandomization ? "true" : "false");
		window.localStorage.setItem("pickedStringOnRandomization", this.pickedStringOnRandomization ? "true" : "false");
		window.localStorage.setItem("spectrumOnRandomization", this.spectrumOnRandomization ? "true" : "false");
		window.localStorage.setItem("FMOnRandomization", this.FMOnRandomization ? "true" : "false");
		window.localStorage.setItem("ADVFMOnRandomization", this.ADVFMOnRandomization ? "true" : "false");
		window.localStorage.setItem("customChipOnRandomization", this.customChipOnRandomization ? "true" : "false");
		window.localStorage.setItem("noiseOnRandomization", this.noiseOnRandomization ? "true" : "false");
		window.localStorage.setItem("wavetableOnRandomization", this.wavetableOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumSpectrumOnRandomization", this.drumSpectrumOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumNoiseOnRandomization", this.drumNoiseOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumsetOnRandomization", this.drumsetOnRandomization ? "true" : "false");

		// Keybind Setup
		window.localStorage.setItem("deactivateCapsLock", this.deactivateCapsLock ? "true" : "false");
		window.localStorage.setItem("CTRLrEvent", this.CTRLrEvent);
		window.localStorage.setItem("deactivateBKeybind", this.deactivateBKeybind ? "true" : "false");
	}

	private _loadBoolean(name: string, defaultToTrue: boolean) {
		return defaultToTrue
			? window.localStorage.getItem(name) != "false"
			: window.localStorage.getItem(name) == "true";
	}
}
