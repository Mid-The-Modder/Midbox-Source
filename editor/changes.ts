// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Algorithm, Dictionary, FilterType, SustainType, InstrumentType, EffectType, AutomationTarget, Config, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludeChorus, effectsIncludeDetune, effectsIncludeNoteFilter, effectsIncludePitchShift, effectsIncludeReverb, effectsIncludeVibrato, effectsIncludeWavefold, effectsIncludeClipper } from "../synth/SynthConfig";
import { NotePin, Note, makeNotePin, Pattern, FilterSettings, FilterControlPoint, SpectrumWave, HarmonicsWave, Instrument, Channel, Song, Synth, EnvelopeSettings, DrumsetEnvelopeSettings, LFOShapes } from "../synth/synth";
import { Preset, PresetCategory, EditorConfig } from "./EditorConfig";
import { Change, ChangeGroup, ChangeSequence, UndoableChange } from "./Change";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { Slider } from "./HTMLWrapper";
import { mod, sigma, clamp } from "./UsefulCodingStuff";

export function patternsContainSameInstruments(pattern1Instruments: number[], pattern2Instruments: number[]): boolean {
    const pattern2Has1Instruments: boolean = pattern1Instruments.every(instrument => pattern2Instruments.indexOf(instrument) != -1);
    const pattern1Has2Instruments: boolean = pattern2Instruments.every(instrument => pattern1Instruments.indexOf(instrument) != -1);
    return pattern2Has1Instruments && pattern1Has2Instruments && pattern2Instruments.length == pattern1Instruments.length;
}

export function discardInvalidPatternInstruments(instruments: number[], song: Song, channelIndex: number) {
    const uniqueInstruments: Set<number> = new Set(instruments);
    instruments.length = 0;
    instruments.push(...uniqueInstruments);
    for (let i: number = 0; i < instruments.length; i++) {
        if (instruments[i] >= song.channels[channelIndex].instruments.length) {
            instruments.splice(i, 1);
            i--;
        }
    }
    if (instruments.length > song.getMaxInstrumentsPerPattern(channelIndex)) {
        instruments.length = song.getMaxInstrumentsPerPattern(channelIndex);
    }
    if (instruments.length <= 0) {
        instruments[0] = 0;
    }
}

export function unionOfUsedNotes(pattern: Pattern, flags: boolean[]): void {
    for (const note of pattern.notes) {
        for (const pitch of note.pitches) {
            for (const pin of note.pins) {
                const key: number = (pitch + pin.interval) % 12;
                if (!flags[key]) {
                    flags[key] = true;
                }
            }
        }
    }
}

export function generateScaleMap(oldScaleFlags: ReadonlyArray<boolean>, newScaleValue: number, customScaleFlags: ReadonlyArray<boolean>): number[] {
    const newScaleFlags: ReadonlyArray<boolean> = newScaleValue == Config.scales["dictionary"]["Custom Scale"].index ? customScaleFlags : Config.scales[newScaleValue].flags;;
    const oldScale: number[] = [];
    const newScale: number[] = [];
    for (let i: number = 0; i < 12; i++) {
        if (oldScaleFlags[i]) oldScale.push(i);
        if (newScaleFlags[i]) newScale.push(i);
    }
    const largerToSmaller: boolean = oldScale.length > newScale.length;
    const smallerScale: number[] = largerToSmaller ? newScale : oldScale;
    const largerScale: number[] = largerToSmaller ? oldScale : newScale;

    const roles: string[] = ["root", "second", "second", "third", "third", "fourth", "tritone", "fifth", "sixth", "sixth", "seventh", "seventh", "root"];
    let bestScore: number = Number.MAX_SAFE_INTEGER;
    let bestIndexMap: number[] = [];
    const stack: number[][] = [[0]]; // Root always maps to root.

    while (stack.length > 0) {
        const indexMap: number[] = stack.pop()!;

        if (indexMap.length == smallerScale.length) {
            // Score this mapping.
            let score: number = 0;
            for (let i: number = 0; i < indexMap.length; i++) {
                score += Math.abs(smallerScale[i] - largerScale[indexMap[i]]);
                if (roles[smallerScale[i]] != roles[largerScale[indexMap[i]]]) {
                    // Penalize changing roles.
                    score += 0.75;
                }
            }
            if (bestScore > score) {
                bestScore = score;
                bestIndexMap = indexMap;
            }
        } else {
            // Recursively choose next indices for mapping.
            const lowIndex: number = indexMap[indexMap.length - 1] + 1;
            const highIndex: number = largerScale.length - smallerScale.length + indexMap.length;
            for (let i: number = lowIndex; i <= highIndex; i++) {
                stack.push(indexMap.concat(i));
            }
        }
    }

    const sparsePitchMap: number[][] = [];
    for (let i: number = 0; i < bestIndexMap.length; i++) {
        const smallerScalePitch = smallerScale[i];
        const largerScalePitch = largerScale[bestIndexMap[i]];
        sparsePitchMap[i] = largerToSmaller
            ? [largerScalePitch, smallerScalePitch]
            : [smallerScalePitch, largerScalePitch];
    }

    // To make it easier to wrap around.
    sparsePitchMap.push([12, 12]);
    newScale.push(12);

    let sparseIndex: number = 0;
    const fullPitchMap: number[] = [];
    for (let i: number = 0; i < 12; i++) {
        const oldLow: number = sparsePitchMap[sparseIndex][0];
        const newLow: number = sparsePitchMap[sparseIndex][1];
        const oldHigh: number = sparsePitchMap[sparseIndex + 1][0];
        const newHigh: number = sparsePitchMap[sparseIndex + 1][1];
        if (i == oldHigh - 1) sparseIndex++;

        const transformedPitch: number = (i - oldLow) * (newHigh - newLow) / (oldHigh - oldLow) + newLow;

        let nearestPitch: number = 0;
        let nearestPitchDistance: number = Number.MAX_SAFE_INTEGER;
        for (const newPitch of newScale) {
            let distance: number = Math.abs(newPitch - transformedPitch);
            if (roles[newPitch] != roles[i]) {
                // Again, penalize changing roles.
                distance += 0.1;
            }
            if (nearestPitchDistance > distance) {
                nearestPitchDistance = distance;
                nearestPitch = newPitch;
            }
        }

        fullPitchMap[i] = nearestPitch;
    }

    return fullPitchMap;
}

function removeRedundantPins(pins: NotePin[]): void {
    for (let i: number = 1; i < pins.length - 1;) {
        if (pins[i - 1].interval == pins[i].interval &&
            pins[i].interval == pins[i + 1].interval &&
            pins[i - 1].size == pins[i].size &&
            pins[i].size == pins[i + 1].size) {
            pins.splice(i, 1);
        } else {
            i++;
        }
    }
}

function projectNoteIntoBar(oldNote: Note, timeOffset: number, noteStartPart: number, noteEndPart: number, newNotes: Note[]): void {
    // Create a new note, and interpret the pitch bend and size events
    // to determine where we need to insert pins to control interval and volume.
    const newNote: Note = new Note(-1, noteStartPart, noteEndPart, Config.noteSizeMax, false);
    newNote.pins.length = 0;
    newNote.pitches.length = 0;
    const newNoteLength: number = noteEndPart - noteStartPart;

    for (const pitch of oldNote.pitches) {
        newNote.pitches.push(pitch);
    }

    for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
        const pin: NotePin = oldNote.pins[pinIndex];
        const newPinTime: number = pin.time + timeOffset;
        if (newPinTime < 0) {
            if (pinIndex + 1 >= oldNote.pins.length) throw new Error("Error converting pins in note overflow.");
            const nextPin: NotePin = oldNote.pins[pinIndex + 1];
            const nextPinTime: number = nextPin.time + timeOffset;
            if (nextPinTime > 0) {
                // Insert an interpolated pin at the start of the new note.
                const ratio: number = (-newPinTime) / (nextPinTime - newPinTime);
                newNote.pins.push(makeNotePin(Math.round(pin.interval + ratio * (nextPin.interval - pin.interval)), 0, Math.round(pin.size + ratio * (nextPin.size - pin.size))));

            }
        } else if (newPinTime <= newNoteLength) {
            newNote.pins.push(makeNotePin(pin.interval, newPinTime, pin.size));
        } else {
            if (pinIndex < 1) throw new Error("Error converting pins in note overflow.");
            const prevPin: NotePin = oldNote.pins[pinIndex - 1];
            const prevPinTime: number = prevPin.time + timeOffset;
            if (prevPinTime < newNoteLength) {
                // Insert an interpolated pin at the end of the new note.
                const ratio: number = (newNoteLength - prevPinTime) / (newPinTime - prevPinTime);
                newNote.pins.push(makeNotePin(Math.round(prevPin.interval + ratio * (pin.interval - prevPin.interval)), newNoteLength, Math.round(prevPin.size + ratio * (pin.size - prevPin.size))));
            }
        }
    }
    
    // Fix from Jummbus: Ensure the first pin's interval is zero, adjust pitches and pins to compensate.
    const offsetInterval: number = newNote.pins[0].interval;
    for (let pitchIdx: number = 0; pitchIdx < newNote.pitches.length; pitchIdx++) {
        newNote.pitches[pitchIdx] += offsetInterval;
    }
    for (let pinIdx: number = 0; pinIdx < newNote.pins.length; pinIdx++) {
        newNote.pins[pinIdx].interval -= offsetInterval;
    }

    let joinedWithPrevNote: boolean = false;
    if (newNote.start == 0) {
        newNote.continuesLastPattern = (timeOffset < 0 || oldNote.continuesLastPattern);
    } else {
        newNote.continuesLastPattern = false;
        if (newNotes.length > 0 && oldNote.continuesLastPattern) {
            const prevNote: Note = newNotes[newNotes.length - 1];
            if (prevNote.end == newNote.start && Synth.adjacentNotesHaveMatchingPitches(prevNote, newNote)) {
                joinedWithPrevNote = true;
                const newIntervalOffset: number = prevNote.pins[prevNote.pins.length - 1].interval;
                const newTimeOffset: number = prevNote.end - prevNote.start;
                for (let pinIndex: number = 1; pinIndex < newNote.pins.length; pinIndex++) {
                    const tempPin: NotePin = newNote.pins[pinIndex];
                    const transformedPin: NotePin = makeNotePin(tempPin.interval + newIntervalOffset, tempPin.time + newTimeOffset, tempPin.size);
                    prevNote.pins.push(transformedPin);
                    prevNote.end = prevNote.start + transformedPin.time;
                }
                removeRedundantPins(prevNote.pins);
            }
        }
    }
    if (!joinedWithPrevNote) {
        newNotes.push(newNote);
    }
}

// The following functions are for custom chip generation seen later on.
export function randomRoundedWave(wave: Float32Array): void {
    let waveLength: number = 64;
    const roundedWaveType: number = (Math.random() * 2 + 1) | 0;
    if (roundedWaveType == 1) {
        // https://www.desmos.com/calculator/hji1istsat
        // "Phased"
        let randomNumber1 = Math.random() * 2 + 0.5;
        let randomNumber2 = Math.random() * 13 + 3;
        let randomNumber3 = Math.random() * 48 - 24;
        for (let i = 0; i < waveLength; i++) {
            wave[i] = clamp(-24, 24+1, Math.round(mod(randomNumber3 + ((Math.sin((i + randomNumber3) / randomNumber2) * 24) + i * randomNumber1), 48) - 24));
        }
    } else if (roundedWaveType == 2) {
        // https://www.desmos.com/calculator/0bxjhiwhwq
        // "Bouncy"
        let randomNumber1 = Math.random() * 0.19 + 0.06;
        let randomNumber2 = Math.random() * 2 + 1;
        let randomNumber3 = Math.random() * 48 - 24;
        let randomNumber4 = Math.random() * 2 - 1;
        for (let i = 0; i < waveLength; i++) {
            wave[i] = clamp(-24, 24+1, Math.round(randomNumber4 * Math.abs(2 * Math.floor((Math.sin((i / randomNumber2) * randomNumber1 + randomNumber3) * Math.cos((i * randomNumber2) * (randomNumber1 / 2)) * 24))) - randomNumber4 * 24));
        }
    }
}

export function randomPulses(wave: Float32Array): void {
    let waveLength: number = 64;
    // Weird math for building random pulses.
    let randomNumber2 = Math.round(Math.random() * 15 + 15);
    let randomNumber3 = Math.round(Math.random() * 3 + 1);
    let randomNumber4 = Math.round(Math.random() * 13 + 2);
    for (let i = 0; i < waveLength; i++) {
        let randomNumber1 = sigma(mod(i, randomNumber2), (i) => 1, randomNumber4);
        wave[i] = clamp(-24, 24+1, Math.round(mod(24 * (sigma(i, (i) => randomNumber1, Math.round(randomNumber2 / randomNumber3))), 24.0000000000001)));
    }
}

export function randomChip(wave: Float32Array): void {
    let waveLength: number = 64;
    const chipType: number = (Math.random() * 2 + 1) | 0;
    if (chipType == 1) {
        // https://www.desmos.com/calculator/udpkkpxqaj
        // "Sawscape"
        let randomNumber1 = Math.random() * 3;
        let randomNumber2 = Math.random() * 0.99 - 1;
        let randomNumber3 = Math.random() * 9 + 2;
        let randomNumber4 = Math.random() * 2 - 1;
        for (let i = 0; i < waveLength; i++) {
            wave[i] = clamp(-24, 24+1, (Math.round(Math.abs(randomNumber4 * mod(((randomNumber2 / randomNumber3) * randomNumber3) + (sigma(i / (randomNumber1 * randomNumber1), (i) => randomNumber3, randomNumber1 * -randomNumber2)) * randomNumber4, 24)))) * 2 - 24);
        }
    } else if (chipType == 2) {
        // https://www.desmos.com/calculator/bmogge156f
        // "Fake Chip"
        let randomNumber1 = Math.random() * 3;
        let randomNumber2 = Math.random() * 2 - 1;
        let randomNumber3 = Math.random() * 100;
        for (let i = 0; i < waveLength; i++) {
            wave[i] = clamp(-24, 24+1, mod(Math.round(mod((sigma(i / randomNumber1, (i) => (randomNumber1 * randomNumber3), 0)), 25 + randomNumber2) * 24), 48) - 24);
        }
    }
}

export function biasedFullyRandom(wave: Float32Array): void {
    let waveLength: number = 64;
    // Math for a fully random custom chip but the higher/lower parts 
    // of the waveform (in height) will contain less samples.
    for (let i: number = 0; i < waveLength; i++) {
        const v = Math.random() * 2 - 1;
        const bias = 6;
        const biased = v > 0 ? Math.pow(v, bias) : -Math.pow(-v, bias);
        wave[i] = clamp(-24, 24 + 1, Math.floor(biased * 24));
    }
}

export function randomizeWave(wave: Float32Array, start: number, end: number): void {
    // Randomize whatever is inside of the start-end parameter.
    for (let i: number = start; i < end; i++) {
        wave[i] = clamp(-24, 24 + 1, ((Math.random() * 48) | 0) - 24);
    }
}

export class ChangeMoveAndOverflowNotes extends ChangeGroup {
    constructor(doc: SongDocument, newBeatsPerBar: number, partsToMove: number) {
        super();

        const pitchChannels: Channel[] = [];
        const noiseChannels: Channel[] = [];
        const modChannels: Channel[] = []

        for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
            const oldChannel: Channel = doc.song.channels[channelIndex];
            const newChannel: Channel = new Channel();

            if (channelIndex < doc.song.pitchChannelCount) {
                pitchChannels.push(newChannel);
            } else if (channelIndex < doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
                noiseChannels.push(newChannel);
            } else {
                modChannels.push(newChannel);
            }

            newChannel.muted = oldChannel.muted;
            newChannel.octave = oldChannel.octave;
            newChannel.name = oldChannel.name;
            for (const instrument of oldChannel.instruments) {
                newChannel.instruments.push(instrument);
            }

            const oldPartsPerBar: number = Config.partsPerBeat * doc.song.beatsPerBar;
            const newPartsPerBar: number = Config.partsPerBeat * newBeatsPerBar;
            let currentBar: number = -1;
            let pattern: Pattern | null = null;
            for (let oldBar: number = 0; oldBar < doc.song.barCount; oldBar++) {
                const oldPattern: Pattern | null = doc.song.getPattern(channelIndex, oldBar);
                if (oldPattern != null) {
                    const oldBarStart: number = oldBar * oldPartsPerBar;
                    for (const oldNote of oldPattern.notes) {
                        const absoluteNoteStart: number = oldNote.start + oldBarStart + partsToMove;
                        const absoluteNoteEnd: number = oldNote.end + oldBarStart + partsToMove;
                        const startBar: number = Math.floor(absoluteNoteStart / newPartsPerBar);
                        const endBar: number = Math.ceil(absoluteNoteEnd / newPartsPerBar);

                        for (let bar: number = startBar; bar < endBar; bar++) {
                            const barStartPart: number = bar * newPartsPerBar;
                            const noteStartPart: number = Math.max(0, absoluteNoteStart - barStartPart);
                            const noteEndPart: number = Math.min(newPartsPerBar, absoluteNoteEnd - barStartPart);

                            if (noteStartPart < noteEndPart) {
                                // Ensure a pattern exists for the current bar before inserting notes into it.
                                if (currentBar < bar || pattern == null) {
                                    currentBar++;
                                    while (currentBar < bar) {
                                        newChannel.bars[currentBar] = 0;
                                        currentBar++;
                                    }
                                    pattern = new Pattern();
                                    newChannel.patterns.push(pattern);
                                    newChannel.bars[currentBar] = newChannel.patterns.length;
                                    pattern.instruments.length = 0;
                                    pattern.instruments.push(...oldPattern.instruments);
                                }
                                // This is a consideration to allow arbitrary note sequencing, e.g. for mod channels (so the pattern being used can jump around)
                                pattern = newChannel.patterns[newChannel.bars[bar] - 1];

                                projectNoteIntoBar(oldNote, absoluteNoteStart - barStartPart - noteStartPart, noteStartPart, noteEndPart, pattern.notes);
                            }
                        }
                    }
                }
            }
        }

        removeDuplicatePatterns(pitchChannels);
        removeDuplicatePatterns(noiseChannels);
        removeDuplicatePatterns(modChannels);
        this.append(new ChangeReplacePatterns(doc, pitchChannels, noiseChannels, modChannels));
    }
}

class ChangePins extends UndoableChange {
    protected _oldStart: number;
    protected _newStart: number;
    protected _oldEnd: number;
    protected _newEnd: number;
    protected _oldPins: NotePin[];
    protected _newPins: NotePin[];
    protected _oldPitches: number[];
    protected _newPitches: number[];
    protected _oldContinuesLastPattern: boolean;
    protected _newContinuesLastPattern: boolean;
    constructor(protected _doc: SongDocument | null, protected _note: Note) {
        super(false);
        this._oldStart = this._note.start;
        this._oldEnd = this._note.end;
        this._newStart = this._note.start;
        this._newEnd = this._note.end;
        this._oldPins = this._note.pins;
        this._newPins = [];
        this._oldPitches = this._note.pitches;
        this._newPitches = [];
        this._oldContinuesLastPattern = this._note.continuesLastPattern;
        this._newContinuesLastPattern = this._note.continuesLastPattern;
    }

    protected _finishSetup(continuesLastPattern?: boolean): void {
        for (let i: number = 0; i < this._newPins.length - 1;) {
            if (this._newPins[i].time >= this._newPins[i + 1].time) {
                this._newPins.splice(i, 1);
            } else {
                i++;
            }
        }
        removeRedundantPins(this._newPins);

        const firstInterval: number = this._newPins[0].interval;
        const firstTime: number = this._newPins[0].time;
        for (let i: number = 0; i < this._oldPitches.length; i++) {
            this._newPitches[i] = this._oldPitches[i] + firstInterval;
        }
        for (let i: number = 0; i < this._newPins.length; i++) {
            this._newPins[i].interval -= firstInterval;
            this._newPins[i].time -= firstTime;
        }
        this._newStart = this._oldStart + firstTime;
        this._newEnd = this._newStart + this._newPins[this._newPins.length - 1].time;

        if (continuesLastPattern != undefined) {
            this._newContinuesLastPattern = continuesLastPattern;
        }
        if (this._newStart != 0) {
            this._newContinuesLastPattern = false;
        }

        this._doForwards();
        this._didSomething();
    }

    protected _doForwards(): void {
        this._note.pins = this._newPins;
        this._note.pitches = this._newPitches;
        this._note.start = this._newStart;
        this._note.end = this._newEnd;
        this._note.continuesLastPattern = this._newContinuesLastPattern;
        if (this._doc != null) this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._note.pins = this._oldPins;
        this._note.pitches = this._oldPitches;
        this._note.start = this._oldStart;
        this._note.end = this._oldEnd;
        this._note.continuesLastPattern = this._oldContinuesLastPattern;
        if (this._doc != null) this._doc.notifier.changed();
    }
}

export class ChangeCustomizeInstrument extends Change {
    constructor(doc: SongDocument) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.preset != instrument.type) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeCustomWave extends Change {
    constructor(doc: SongDocument, newArray: Float32Array) {
        super();
        const oldArray: Float32Array = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customChipWave;
        var comparisonResult: boolean = true;
        for (let i: number = 0; i < oldArray.length; i++) {
            if (oldArray[i] != newArray[i]) {
                comparisonResult = false;
                i = oldArray.length;
            }
        }
        if (comparisonResult == false) {
            let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
            for (let i: number = 0; i < newArray.length; i++) {
                instrument.customChipWave[i] = newArray[i];
            }

            let sum: number = 0.0;
            for (let i: number = 0; i < instrument.customChipWave.length; i++) {
                sum += instrument.customChipWave[i];
            }
            const average: number = sum / instrument.customChipWave.length;

            // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
            let cumulative: number = 0;
            let wavePrev: number = 0;
            for (let i: number = 0; i < instrument.customChipWave.length; i++) {
                cumulative += wavePrev;
                wavePrev = instrument.customChipWave[i] - average;
                instrument.customChipWaveIntegral[i] = cumulative;
            }

            instrument.customChipWaveIntegral[64] = 0.0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeWavetableCustomWave extends Change {
    constructor(doc: SongDocument, newArray: Float32Array, index: number) {
        super();
        const oldArray: Float32Array = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].wavetableWaves[index];
        var comparisonResult: boolean = true;
        for (let i: number = 0; i < oldArray.length; i++) {
            if (oldArray[i] != newArray[i]) {
                comparisonResult = false;
                i = oldArray.length;
            }
        }
        if (comparisonResult == false) {
            let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
            for (let i: number = 0; i < newArray.length; i++) {
                instrument.wavetableWaves[index][i] = newArray[i];
            }

            let sum: number = 0.0;
            for (let i: number = 0; i < instrument.wavetableWaves[index].length; i++) {
                sum += instrument.wavetableWaves[index][i];
            }
            const average: number = sum / instrument.wavetableWaves[index].length;

            // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
            let cumulative: number = 0;
            let wavePrev: number = 0;
            for (let i: number = 0; i < instrument.wavetableWaves[index].length; i++) {
                cumulative += wavePrev;
                wavePrev = instrument.wavetableWaves[index][i] - average;
                instrument.wavetableIntegralWaves[index][i] = cumulative;
            }

            instrument.wavetableIntegralWaves[index][64] = 0.0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeCycleWaves extends Change {
    constructor(doc: SongDocument, newArray: number[]) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldArray: number[] = instrument.currentCycle;
        let comparisonResult: boolean = true;
        if (oldArray.length !== newArray.length) {
            comparisonResult = false;
        } else {
            for (let i: number = 0; i < oldArray.length; i++) {
                if (oldArray[i] != newArray[i]) {
                    comparisonResult = false;
                    break;
                }
            }
        }
        if (comparisonResult == false) {
            instrument.currentCycle = [];
            for (let i: number = 0; i < newArray.length; i++) {
                instrument.currentCycle.push(newArray[i]);
            }
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeCustomAlgorithmOrFeedback extends Change {
    constructor(doc: SongDocument, newArray: number[][], carry: number, mode: string) {
        super();
        if (mode == "algorithm") {
            const oldArray: number[][] = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customAlgorithm.modulatedBy;
            const oldCarriercount: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customAlgorithm.carrierCount;
            var comparisonResult: boolean = true;
            if (carry != oldCarriercount) {
                comparisonResult = false;
            } else {
                for (let i: number = 0; i < oldArray.length; i++) {
                    if (oldArray[i].length != newArray[i].length) {
                        comparisonResult = false;
                        break;
                    } else {
                        for (let j: number = 0; j < oldArray[i].length; j++) {
                            if (oldArray[i][j] != newArray[i][j]) {
                                comparisonResult = false;
                                break;
                            }
                        }
                    }
                }
            }
            if (comparisonResult == false) {
                let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

                instrument.customAlgorithm.set(carry, newArray);

                instrument.algorithm6Op = 0;
                doc.notifier.changed();
                this._didSomething();
            }
        } else if (mode == "feedback") {
            const oldArray: number[][] = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customFeedbackType.indices;
            var comparisonResult: boolean = true;
			for (let i: number = 0; i < oldArray.length; i++) {
				if (oldArray[i].length != newArray[i].length) {
					comparisonResult = false;
					break;
				} else {
					for (let j: number = 0; j < oldArray[i].length; j++) {
						if (oldArray[i][j] != newArray[i][j]) {
							comparisonResult = false;
							break;
						}
					}
				}
			}
            if (!comparisonResult) {
                let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

                instrument.customFeedbackType.set(newArray);
                instrument.feedbackType6Op = 0;
                doc.notifier.changed();
                this._didSomething();
            }
        }
    }
}

export class ChangePreset extends Change {
    constructor(doc: SongDocument, newValue: number, channelIdx: number, instrumentIdx: number) {
        super();
        const instrument: Instrument = doc.song.channels[channelIdx].instruments[instrumentIdx];
        const isMod: boolean = doc.song.getChannelIsMod(channelIdx);
        const oldValue: number = instrument.preset;
        if ((oldValue != newValue) && !isMod) {
            const preset: Preset | null = EditorConfig.valueToPreset(newValue);
            if (preset != null) {
                if (preset.customType != undefined) {
                    instrument.type = preset.customType;
                    if (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[instrument.chord].customInterval) {
                        instrument.chord = 0;
                    }
                    instrument.clearInvalidEnvelopeTargets();
                } else if (preset.settings != undefined) {
                    const tempVolume: number = instrument.volume;
                    const tempPan: number = instrument.pan;
                    const tempPanDelay = instrument.panDelay;
                    instrument.fromJsonObject(preset.settings, doc.song.getChannelIsNoise(channelIdx), doc.song.getChannelIsMod(channelIdx), doc.song.rhythm == 0 || doc.song.rhythm == 2, doc.song.rhythm >= 2);
                    instrument.volume = tempVolume;
                    instrument.pan = tempPan;
                    instrument.panDelay = tempPanDelay;
                    instrument.effects = (instrument.effects | (1 << EffectType.panning));
                }
            }
            instrument.preset = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeRandomGeneratedInstrument extends Change {
    constructor(doc: SongDocument, channelIdx: number, instrumentIdx: number) {
        super();

        interface ItemWeight<T> {
            readonly item: T;
            readonly weight: number;
        }
        function selectWeightedRandom<T>(entries: ReadonlyArray<ItemWeight<T>>): T {
            let total: number = 0;
            for (const entry of entries) {
                total += entry.weight;
            }
            let random: number = Math.random() * total;
            for (const entry of entries) {
                random -= entry.weight;
                if (random <= 0.0) return entry.item;
            }
            return entries[(Math.random() * entries.length) | 0].item;
        }
        function selectCurvedDistribution(min: number, max: number, peak: number, width: number): number {
            const entries: Array<ItemWeight<number>> = [];
            for (let i: number = min; i <= max; i++) {
                entries.push({ item: i, weight: 1.0 / (Math.pow((i - peak) / width, 2.0) + 1.0) });
            }
            return selectWeightedRandom(entries);
        }

        class PotentialFilterPoint {
            constructor(
                public readonly chance: number,
                public readonly type: FilterType,
                public readonly minFreq: number,
                public readonly maxFreq: number,
                public readonly centerHz: number,
                public readonly centerGain: number,
            ) { };
        }
        function applyFilterPoints(filter: FilterSettings, potentialPoints: ReadonlyArray<PotentialFilterPoint>): void {
            filter.reset();
            const usedFreqs: number[] = [];
            for (const potentialPoint of potentialPoints) {
                if (Math.random() > potentialPoint.chance) continue;
                const point: FilterControlPoint = new FilterControlPoint();
                point.type = potentialPoint.type;
                point.freq = selectCurvedDistribution(potentialPoint.minFreq, potentialPoint.maxFreq, FilterControlPoint.getRoundedSettingValueFromHz(potentialPoint.centerHz), 1.0 / Config.filterFreqStep);
                point.gain = selectCurvedDistribution(0, Config.filterGainRange - 1, Config.filterGainCenter + potentialPoint.centerGain, 2.0 / Config.filterGainStep);
                if (point.type == FilterType.peak && point.gain == Config.filterGainCenter) continue; // skip pointless points. :P
                if (usedFreqs.includes(point.freq)) continue;
                usedFreqs.push(point.freq);
                filter.controlPoints[filter.controlPointCount] = point;
                filter.controlPointCount++;
            }
        }

        const isNoise: boolean = doc.song.getChannelIsNoise(channelIdx);
        const isMod: boolean = doc.song.getChannelIsMod(channelIdx);
        const instrument: Instrument = doc.song.channels[channelIdx].instruments[instrumentIdx];
        instrument.effects = 1 << EffectType.panning; // disable all existing effects except panning, which should always be on.
        instrument.aliases = false;
        instrument.envelopeCount = 0;

        const midFreq: number = FilterControlPoint.getRoundedSettingValueFromHz(700.0);
        const maxFreq: number = Config.filterFreqRange - 1;
        if (!isMod) {
            applyFilterPoints(instrument.eqFilter, [
                new PotentialFilterPoint(0.8, FilterType.lowPass, midFreq, maxFreq, 4000.0, -1),
                new PotentialFilterPoint(0.4, FilterType.highPass, 0, midFreq - 1, 250.0, -1),
                new PotentialFilterPoint(0.5, FilterType.peak, 0, maxFreq, 2000.0, 0),
                new PotentialFilterPoint(0.4, FilterType.peak, 0, maxFreq, 1400.0, 0),
                new PotentialFilterPoint(0.3, FilterType.peak, 0, maxFreq, 1000.0, 0),
                new PotentialFilterPoint(0.2, FilterType.peak, 0, maxFreq, 500.0, 0),
            ]);
        } else {
            instrument.eqFilter = instrument.eqFilter;
        }

        if (isMod) {
            // Skip modulator channels.
        } else if (isNoise) {
            const possibleTypes: ({ item: InstrumentType, weight: number })[] = [];
            if (doc.prefs.drumSpectrumOnRandomization) { possibleTypes.push({ item: InstrumentType.spectrum, weight: 3 }); }
            if (doc.prefs.drumNoiseOnRandomization) { possibleTypes.push({ item: InstrumentType.noise, weight: 3 }); }
            if (doc.prefs.drumsetOnRandomization) { possibleTypes.push({ item: InstrumentType.drumset, weight: 3 }); }

            let type: InstrumentType = instrument.type;
            if (possibleTypes.length > 0) {
                type = selectWeightedRandom(possibleTypes);
            }
            instrument.preset = instrument.type = type;

            // Drumset doesn't have fade in/out so do not include it here.
            if (instrument.type != InstrumentType.drumset) {
                instrument.fadeIn = (Math.random() < 0.5) ? 0 : selectCurvedDistribution(0, Config.fadeInRange - 1, 0, 2);
                instrument.fadeOut = selectCurvedDistribution(0, Config.fadeOutTicks.length - 1, Config.fadeOutNeutral, 2);
            }

            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.transition;
                instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
                    { item: "normal", weight: 30 },
                    { item: "interrupt", weight: 2 },
                    { item: "slide", weight: 2 },
                    { item: "continue", weight: 2 },
                ])].index;
            } else {
                instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
                    { item: "normal", weight: 1 },
                ])].index;
            }
            if (Math.random() < 0.2) {
                instrument.effects |= 1 << EffectType.chord;
                instrument.chord = Config.chords.dictionary[selectWeightedRandom([
                    { item: "strum", weight: 2 },
                    { item: "arpeggio", weight: 2 },
                ])].index;
            }
            if (Math.random() < 0.1) {
                instrument.pitchShift = selectCurvedDistribution(0, Config.pitchShiftRange - 1, Config.pitchShiftCenter, 2);
                if (instrument.pitchShift != Config.pitchShiftCenter) {
                    instrument.effects |= 1 << EffectType.pitchShift;
                    if (Math.random() < 0.9) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pitchShift"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox click", weight: 2 },
                        { item: "modbox bow", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                    ])].index);
                }
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.vibrato;
                instrument.vibrato = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.vibrato = Config.vibratos.dictionary[selectWeightedRandom([
                    { item: "light", weight: 2 },
                    { item: "delayed", weight: 2 },
                    { item: "heavy", weight: 2 },
                    { item: "shaky", weight: 2 },
                ])].index;
            }
            if (Math.random() < 0.8) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(1.0, FilterType.lowPass, midFreq, maxFreq, 8000.0, -1),
                ]);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2},
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox blip", weight: 2 },
                        { item: "modbox click", weight: 2 },
                        { item: "modbox bow", weight: 2 },
                        { item: "modbox trill", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.175) {
                instrument.effects |= 1 << EffectType.wavefold;
                instrument.wavefoldBounds = Math.round(Math.random() * Config.wavefoldMax);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["wavefoldBounds"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.15) {
                instrument.effects |= 1 << EffectType.distortion;
                instrument.distortion = selectCurvedDistribution(1, Config.distortionRange - 1, Config.distortionRange - 1, 2);
                if (Math.random() < 0.35) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["distortion"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2},
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox blip", weight: 2 },
                        { item: "modbox click", weight: 2 },
                        { item: "modbox bow", weight: 2 },
                        { item: "modbox trill", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.135) {
                instrument.effects |= 1 << EffectType.clipper;
                instrument.clipBounds = Math.round(Math.random() * Config.clipMax);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["clipBounds"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.15) {
                instrument.effects |= 1 << EffectType.bitcrusher;
                instrument.bitcrusherFreq = selectCurvedDistribution(0, Config.bitcrusherFreqRange - 1, Config.bitcrusherFreqRange >> 1, 2);
                instrument.bitcrusherQuantization = selectCurvedDistribution(0, Config.bitcrusherQuantizationRange - 1, Config.bitcrusherQuantizationRange >> 1, 2);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["bitCrusher"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["freqCrusher"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.15) {
                instrument.effects |= 1 << EffectType.chorus;
                instrument.chorus = selectCurvedDistribution(1, Config.chorusRange - 1, Config.chorusRange - 1, 1);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["chorus"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.1) {
                instrument.echoSustain = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.echoDelay = Math.round(Math.random() * Config.echoDelayRange);
                if (instrument.echoSustain != 0 || instrument.echoDelay != 0) {
                    instrument.effects |= 1 << EffectType.echo;
                }
            }
            if (Math.random() < 0.4) {
                instrument.effects |= 1 << EffectType.reverb;
                instrument.reverb = selectCurvedDistribution(1, Config.reverbRange - 1, 1, 1);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["reverb"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }

            if (type == InstrumentType.noise || type == InstrumentType.spectrum) {
                instrument.unison = Config.unisons.dictionary[selectWeightedRandom([
                    { item: "none", weight: 10 },
                    { item: "shimmer", weight: 1 },
                    { item: "hum", weight: 1 },
                    { item: "honky tonk", weight: 1 },
                    { item: "dissonant", weight: 1 },
                    { item: "fifth", weight: 1 },
                    { item: "octave", weight: 1 },
                    { item: "bowed", weight: 1 },
                    { item: "piano", weight: 1 },
                    { item: "warbled", weight: 1 },
                    { item: "hecking gosh", weight: 1 },
                    { item: "hold", weight: 1 },
                    { item: "broke", weight: 1 },
                ])].index;

                if (instrument.unison != Config.unisons.dictionary["none"].index && Math.random() > 0.4) {
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["unison"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2},
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox blip", weight: 2 },
                        { item: "modbox click", weight: 2 },
                        { item: "modbox bow", weight: 2 },
                        { item: "modbox trill", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                    ])].index);
                }
            }

            function normalize(harmonics: number[]): void {
                let max: number = 0;
                for (const value of harmonics) {
                    if (value > max) max = value;
                }
                for (let i: number = 0; i < harmonics.length; i++) {
                    harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
                }
            }
            switch (type) {
                case InstrumentType.noise: {
                    instrument.chipNoise = (Math.random() * Config.chipNoises.length) | 0;
                } break;
                case InstrumentType.spectrum: {
                    const spectrumGenerators: Function[] = [
                        (): number[] => {
                            const spectrum: number[] = [];
                            for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                                spectrum[i] = (Math.random() < 0.5) ? Math.random() : 0.0;
                            }
                            return spectrum;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const spectrum: number[] = [current];
                            for (let i = 1; i < Config.spectrumControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.52);
                                spectrum[i] = current;
                            }
                            return spectrum;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const spectrum: number[] = [current];
                            for (let i = 1; i < Config.spectrumControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.52);
                                spectrum[i] = current * Math.random();
                            }
                            return spectrum;
                        },
                    ];
                    const generator = spectrumGenerators[(Math.random() * spectrumGenerators.length) | 0];
                    const spectrum: number[] = generator();
                    normalize(spectrum);
                    for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                        instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
                    }
                    instrument.spectrumWave.markCustomWaveDirty();
                } break;
                case InstrumentType.drumset: {
                    for (let i: number = 0; i < Config.drumCount; i++) {
                        instrument.drumsetEnvelopes[i].envelope = Math.floor(Math.random() * Config.drumsetEnvelopes.length);
                        const spectrum: number[] = [];
                        let randomFactor: number = Math.floor(Math.random() * 3)
                        for (let j = 0; j < Config.spectrumControlPoints; j++) {
                            if (randomFactor == 0 || randomFactor == 3) spectrum[j] = Math.pow(Math.random(), 3) * 0.25;
                            else if (randomFactor == 1) spectrum[j] = Math.pow(Math.random(), ((i / 8) + 1));
                            else if (randomFactor == 2) spectrum[j] = (Math.pow(Math.random(), 2)) * ((i / 3) + 1);
                            else spectrum[j] = Math.pow(Math.random(), 3) * 0.25;
                        }
                        normalize(spectrum);
                        for (let j: number = 0; j < Config.spectrumControlPoints; j++) {
                            instrument.drumsetSpectrumWaves[i].spectrum[j] = Math.round(spectrum[j]);
                        }
                        instrument.drumsetSpectrumWaves[i].markCustomWaveDirty();
                    }
                } break;
                default: throw new Error("Unhandled noise instrument type in random generator.");
            }
        } else {
            const possibleTypes: ({ item: InstrumentType, weight: number })[] = [];
            if (doc.prefs.chipWaveOnRandomization) { possibleTypes.push({ item: InstrumentType.chip, weight: 3 }); }
            if (doc.prefs.PWMOnRandomization) { possibleTypes.push({ item: InstrumentType.pwm, weight: 3 }); }
            if (doc.prefs.harmonicsOnRandomization) { possibleTypes.push({ item: InstrumentType.harmonics, weight: 3 }); }
            if (doc.prefs.pickedStringOnRandomization) { possibleTypes.push({ item: InstrumentType.pickedString, weight: 3 }); }
            if (doc.prefs.spectrumOnRandomization) { possibleTypes.push({ item: InstrumentType.spectrum, weight: 3 }); }
            if (doc.prefs.FMOnRandomization) { possibleTypes.push({ item: InstrumentType.fm, weight: 3 }); }
            if (doc.prefs.supersawOnRandomization) { possibleTypes.push({ item: InstrumentType.supersaw, weight: 3 }); }
            if (doc.prefs.customChipOnRandomization) { possibleTypes.push({ item: InstrumentType.customChipWave, weight: 3 }); }
            if (doc.prefs.noiseOnRandomization) { possibleTypes.push({ item: InstrumentType.noise, weight: 3 }); }
            if (doc.prefs.wavetableOnRandomization) { possibleTypes.push({ item: InstrumentType.wavetable, weight: 3 }); }
            if (doc.prefs.ADVFMOnRandomization) { possibleTypes.push({ item: InstrumentType.advfm, weight: 3 }); }

            let type: InstrumentType = instrument.type;
            if (possibleTypes.length > 0) {
                type = selectWeightedRandom(possibleTypes);
            }
            instrument.preset = instrument.type = type;

            instrument.fadeIn = (Math.random() < 0.5) ? 0 : selectCurvedDistribution(0, Config.fadeInRange - 1, 0, 2);
            instrument.fadeOut = selectCurvedDistribution(0, Config.fadeOutTicks.length - 1, Config.fadeOutNeutral, 2);

            if (type == InstrumentType.chip || type == InstrumentType.harmonics || type == InstrumentType.pickedString || type == InstrumentType.customChipWave || type == InstrumentType.pwm || type == InstrumentType.spectrum || type == InstrumentType.wavetable || type == InstrumentType.noise) {
                instrument.unison = Config.unisons.dictionary[selectWeightedRandom([
                    { item: "none", weight: 20 },
                    { item: "shimmer", weight: 2 },
                    { item: "hum", weight: 2 },
                    { item: "honky tonk", weight: 2 },
                    { item: "dissonant", weight: 2 },
                    { item: "fifth", weight: 2 },
                    { item: "octave", weight: 2 },
                    { item: "bowed", weight: 2 },
                    { item: "piano", weight: 2 },
                    { item: "warbled", weight: 2 },
                    { item: "hyper", weight: 2 },
                    { item: "peak", weight: 2 },
                    { item: "deep shift", weight: 2 },
                    { item: "broke", weight: 2 },
                    { item: "vary", weight: 2 },
                    { item: "energetic", weight: 2 },
                    { item: "lone fifth", weight: 2 },
                    { item: "alternate fifth", weight: 2 },
                    { item: "offtune", weight: 2 },
                    { item: "hold", weight: 2 },
                    { item: "buried", weight: 2 },
                    { item: "corrupt", weight: 2 },
                    { item: "weird octave", weight: 2 },
                    { item: "bent", weight: 2 },
                ])].index;
                instrument.unisonVoices = Config.unisons[instrument.unison].voices;
                instrument.unisonSpread = Config.unisons[instrument.unison].spread;
                instrument.unisonOffset = Config.unisons[instrument.unison].offset;
                instrument.unisonExpression = Config.unisons[instrument.unison].expression;
                instrument.unisonSign = Config.unisons[instrument.unison].sign;
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.transition;
                instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
                    { item: "interrupt", weight: 1 },
                    { item: "slide", weight: 1 },
                    { item: "continue", weight: 1 },
                ])].index;
            } else {
                instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
                    { item: "normal", weight: 1 },
                ])].index;
            }
            if (Math.random() < 0.2) {
                instrument.effects |= 1 << EffectType.chord;
                instrument.chord = Config.chords.dictionary[selectWeightedRandom([
                    { item: "strum", weight: 1 },
                    { item: "arpeggio", weight: 1 },
                ])].index;
            }
            if (Math.random() < 0.075) {
                instrument.pitchShift = selectCurvedDistribution(0, Config.pitchShiftRange - 1, Config.pitchShiftCenter, 1);
                if (instrument.pitchShift != Config.pitchShiftCenter) {
                    instrument.effects |= 1 << EffectType.pitchShift;
                    if (Math.random() < 0.20) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pitchShift"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox click", weight: 2 },
                        { item: "modbox bow", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                    ])].index);
                }
            }
            if (Math.random() < 0.25) {
                instrument.effects |= 1 << EffectType.vibrato;
                instrument.vibrato = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.vibrato = Config.vibratos.dictionary[selectWeightedRandom([
                    { item: "light", weight: 2 },
                    { item: "delayed", weight: 2 },
                    { item: "heavy", weight: 2 },
                    { item: "shaky", weight: 2 },
                ])].index;
            }
            if (Math.random() < 0.125) {
                instrument.effects |= 1 << EffectType.wavefold;
                instrument.wavefoldBounds = Math.round(Math.random() * Config.wavefoldMax);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["wavefoldBounds"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.135) {
                instrument.effects |= 1 << EffectType.distortion;
                instrument.distortion = selectCurvedDistribution(1, Config.distortionRange - 1, Config.distortionRange - 1, 2);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["distortion"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.16) {
                instrument.effects |= 1 << EffectType.clipper;
                instrument.clipBounds = Math.round(Math.random() * Config.clipMax);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["clipBounds"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.12) {
                instrument.effects |= 1 << EffectType.bitcrusher;
                instrument.bitcrusherFreq = selectCurvedDistribution(0, Config.bitcrusherFreqRange - 1, 0, 2);
                instrument.bitcrusherQuantization = selectCurvedDistribution(0, Config.bitcrusherQuantizationRange - 1, Config.bitcrusherQuantizationRange >> 1, 2);
                if (Math.random() < 0.20) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["bitCrusher"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
                if (Math.random() < 0.18) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["freqCrusher"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (effectsIncludeDistortion(instrument.effects) && Math.random() < 0.8) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(1.0, FilterType.lowPass, midFreq, maxFreq, 2000.0, -1),
                    new PotentialFilterPoint(0.9, FilterType.highPass, 0, midFreq - 1, 500.0, -1),
                    new PotentialFilterPoint(0.4, FilterType.peak, 0, maxFreq, 1400.0, 0),
                ]);
            } else if (effectsIncludeBitcrusher(instrument.effects) && Math.random() < 0.8 && (instrument.bitcrusherQuantization > 5 || (instrument.bitcrusherFreq > 7 && instrument.bitcrusherFreq < 11))) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(0.6, FilterType.lowPass, midFreq, maxFreq, 8000.0, -1),
                    new PotentialFilterPoint(0.75, FilterType.peak, 0, 4, 8000.0, 6),
                    new PotentialFilterPoint(1.0, FilterType.peak, 2, 6, 8000.0, 6),
                    new PotentialFilterPoint(0.9, FilterType.peak, 3, 8, 4000.0, 7),
                    new PotentialFilterPoint(0.75, FilterType.peak, 6, 8, 6000.0, 9),
                    new PotentialFilterPoint(0.6, FilterType.peak, 4, 13, 6000.0, 8),
                    new PotentialFilterPoint(0.2, FilterType.highPass, 0, 2, 500.0, -1),
                ]);
                if (Math.random() < 0.75) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 20 },
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox bow", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                ])].index);
            } else if (Math.random() < 0.5) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(1.0, FilterType.lowPass, midFreq, maxFreq, 8000.0, -1),
                ]);
                instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2 },
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox click", weight: 2 },
                        { item: "modbox bow", weight: 2 },
                        { item: "modbox trill", weight: 2 },
                        { item: "modbox blip", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.12) {
                instrument.effects |= 1 << EffectType.chorus;
                instrument.chorus = selectCurvedDistribution(1, Config.chorusRange - 1, Config.chorusRange - 1, 1);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["chorus"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }
            if (Math.random() < 0.12) {
                instrument.echoSustain = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.echoDelay = Math.round(Math.random() * Config.echoDelayRange);
                if (instrument.echoSustain != 0 || instrument.echoDelay != 0) {
                    instrument.effects |= 1 << EffectType.echo;
                }
            }
            if (Math.random() < 0.4) {
                instrument.effects |= 1 << EffectType.reverb;
                instrument.reverb = selectCurvedDistribution(1, Config.reverbRange - 1, 1, 1);
                if (Math.random() < 0.25) instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["reverb"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2},
                    { item: "punch", weight: 2 },
                    { item: "flare", weight: 2},
                    { item: "twang", weight: 2},
                    { item: "swell", weight: 2},
                    { item: "decay", weight: 2},
                    { item: "modbox blip", weight: 2 },
                    { item: "modbox click", weight: 2 },
                    { item: "modbox bow", weight: 2 },
                    { item: "modbox trill", weight: 2 },
                    { item: "wibble", weight: 2},
                    { item: "linear", weight: 2},
                    { item: "rise", weight: 2},
                    { item: "jummbox blip", weight: 2},
                ])].index);
            }

            function normalize(harmonics: number[]): void {
                let max: number = 0;
                for (const value of harmonics) {
                    if (value > max) max = value;
                }
                for (let i: number = 0; i < harmonics.length; i++) {
                    harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
                }
            }
            switch (type) {
                case InstrumentType.chip: {
                    instrument.chipWave = (Math.random() * Config.chipWaves.length) | 0;
                } break;
                case InstrumentType.pwm: {
                    instrument.pulseWidth = selectCurvedDistribution(0, Config.pulseWidthRange - 1, Config.pulseWidthRange - 1, 2);

                    if (Math.random() < 0.6) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2 },
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 2},
                        { item: "twang", weight: 2},
                        { item: "swell", weight: 2},
                        { item: "decay", weight: 2},
                        { item: "modbox click", weight: 2 },
                        { item: "modbox trill", weight: 2 },
                        { item: "modbox blip", weight: 2 },
                        { item: "wibble", weight: 2},
                        { item: "linear", weight: 2},
                        { item: "rise", weight: 2},
                        { item: "jummbox blip", weight: 2},
                        ])].index);
                    }
                } break;
                case InstrumentType.supersaw: {
                    instrument.supersawDynamism = selectCurvedDistribution(0, Config.supersawDynamismMax, Config.supersawDynamismMax, 2);
                    instrument.pulseWidth = selectCurvedDistribution(0, Config.pulseWidthRange - 1, Config.pulseWidthRange - 1, 2);
                    instrument.supersawSpread = selectCurvedDistribution(0, Config.supersawSpreadMax, Math.ceil(Config.supersawSpreadMax / 3), 4);
                    instrument.supersawShape = selectCurvedDistribution(0, Config.supersawShapeMax, 0, 4);

                    if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.3) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox click", weight: 2 },
                                { item: "modbox bow", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                        ])].index);
                    }
                    if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.3) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["supersawDynamism"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox click", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                        ])].index);
                    }
                    if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.3) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["supersawShape"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox click", weight: 2 },
                                { item: "modbox bow", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                        ])].index);
                    }
                    if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.3) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["supersawSpread"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox click", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                        ])].index);
                    }
                } break;
                case InstrumentType.pickedString:
                case InstrumentType.harmonics: {
                    if (type == InstrumentType.pickedString) {
                        instrument.stringSustain = (Math.random() * Config.stringSustainRange) | 0;
                    }

                    const harmonicGenerators: Function[] = [
                        (): number[] => {
                            const harmonics: number[] = [];
                            for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                                harmonics[i] = (Math.random() < 0.4) ? Math.random() : 0.0;
                            }
                            harmonics[(Math.random() * 8) | 0] = Math.pow(Math.random(), 0.25);
                            return harmonics;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const harmonics: number[] = [current];
                            for (let i = 1; i < Config.harmonicsControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.55);
                                harmonics[i] = current;
                            }
                            return harmonics;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const harmonics: number[] = [current];
                            for (let i = 1; i < Config.harmonicsControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.55);
                                harmonics[i] = current * Math.random();
                            }
                            return harmonics;
                        },
                    ];
                    const generator = harmonicGenerators[(Math.random() * harmonicGenerators.length) | 0];
                    const harmonics: number[] = generator();
                    normalize(harmonics);
                    for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                        instrument.harmonicsWave.harmonics[i] = Math.round(harmonics[i]);
                    }
                    instrument.harmonicsWave.markCustomWaveDirty();
                } break;
                case InstrumentType.spectrum: {
                    const spectrum: number[] = [];
                    for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                        const isHarmonic: boolean = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21;
                        if (isHarmonic) {
                            spectrum[i] = Math.pow(Math.random(), 0.25);
                        } else {
                            spectrum[i] = Math.pow(Math.random(), 3) * 0.5;
                        }
                    }
                    normalize(spectrum);
                    for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                        instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
                    }
                    instrument.spectrumWave.markCustomWaveDirty();
                } break;
                case InstrumentType.advfm:
                case InstrumentType.fm: {
                    if (type == InstrumentType.fm) {
                        instrument.algorithm = (Math.random() * Config.algorithms.length) | 0;
                        instrument.feedbackType = (Math.random() * Config.feedbacks.length) | 0;
                    } else {
                        instrument.algorithm6Op = (Math.random() * (Config.algorithms6Op.length-1)+1) | 0;
                        instrument.customAlgorithm.fromPreset(instrument.algorithm6Op);
                        instrument.feedbackType6Op = (Math.random() * (Config.feedbacks6Op.length-1)+1) | 0;
                        instrument.customFeedbackType.fromPreset(instrument.feedbackType6Op);
                    }
                    const algorithm: Algorithm = type == InstrumentType.fm ? Config.algorithms[instrument.algorithm] : Config.algorithms6Op[instrument.algorithm6Op];
                    for (let i: number = 0; i < algorithm.carrierCount; i++) {
                        instrument.operators[i].frequency = selectCurvedDistribution(0, Config.operatorFrequencies.length - 1, 0, 3);
                        instrument.operators[i].amplitude = selectCurvedDistribution(0, Config.operatorAmplitudeMax, Config.operatorAmplitudeMax - 1, 2);
                        instrument.operators[i].waveform = Config.operatorWaves.dictionary[selectWeightedRandom([
                            { item: "sine", weight: 3 },
                            { item: "triangle", weight: 3 },
                            { item: "sawtooth", weight: 3 },
                            { item: "pulse width", weight: 3 },
                            { item: "ramp", weight: 3 },
                            { item: "trapezoid", weight: 3 },
                            { item: "clang", weight: 3},
                            { item: "metallic", weight: 3},
                            { item: "quasi-sine", weight: 3},
                            { item: "secant", weight: 3},
                            { item: "absine", weight: 3},
                            { item: "semisine", weight: 3},
                            { item: "camelsine", weight: 3},
                            { item: "pulsine", weight: 3},
                            { item: "sharksine", weight: 3},
                            { item: "logarithmic saw", weight: 3},
                            { item: "white noise", weight: 3},
                        ])].index;
                        if (instrument.operators[i].waveform == 3/*"pulse width"*/) {
                            const [pulseWidth, pulseWidthDecimalOffset] = selectWeightedRandom([
                                { item: [1, 0], weight: 3 },
                                { item: [3, 50], weight: 3 },
                                { item: [5, 0], weight: 3 },
                                { item: [7, 75], weight: 3 },
                                { item: [10, 0], weight: 3 },
                                { item: [13, 50], weight: 3 },
                                { item: [15, 0], weight: 3 },
                                { item: [18, 50], weight: 3 },
                                { item: [20, 0], weight: 3 },
                                { item: [25, 0], weight: 3 },
                                { item: [30, 0], weight: 3 },
                                { item: [34, 66], weight: 3 },
                                { item: [40, 0], weight: 3 },
                                { item: [45, 0], weight: 3 },
                                { item: [50, 0], weight: 25 }, // 50%
                                { item: [55, 0], weight: 3 },
                                { item: [60, 0], weight: 3 },
                                { item: [67, 33], weight: 3 },
                                { item: [70, 0], weight: 3 },
                                { item: [75, 0], weight: 3 },
                                { item: [80, 0], weight: 3 },
                                { item: [83, 50], weight: 3 },
                                { item: [85, 0], weight: 3 },
                                { item: [88, 50], weight: 3 },
                                { item: [90, 0], weight: 3 },
                                { item: [94, 25], weight: 3 },
                                { item: [95, 0], weight: 3 },
                                { item: [98, 50], weight: 3 },
                                { item: [99, 0], weight: 3 },
                            ]);
                            instrument.operators[i].pulseWidth = pulseWidth;
							instrument.operators[i].pulseWidthDecimalOffset = pulseWidthDecimalOffset;
                        }
                    }
                    for (let i: number = algorithm.carrierCount; i < Config.operatorCount + (type == InstrumentType.advfm ? 2 : 0); i++) {
                        instrument.operators[i].frequency = selectCurvedDistribution(3, Config.operatorFrequencies.length - 1, 0, 3);
                        instrument.operators[i].amplitude = (Math.pow(Math.random(), 2) * Config.operatorAmplitudeMax) | 0;
                        if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.4) {
                            instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, i, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox click", weight: 2 },
                                { item: "modbox bow", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                            ])].index);
                            instrument.operators[i].waveform = Config.operatorWaves.dictionary[selectWeightedRandom([
                                { item: "sine", weight: 3 },
                                { item: "triangle", weight: 3 },
                                { item: "sawtooth", weight: 3 },
                                { item: "pulse width", weight: 3 },
                                { item: "ramp", weight: 3 },
                                { item: "trapezoid", weight: 3 },
                                { item: "clang", weight: 3 },
                                { item: "metallic", weight: 3 },
                                { item: "quasi-sine", weight: 3},
                                { item: "secant", weight: 3},
                                { item: "absine", weight: 3},
                                { item: "semisine", weight: 3},
                                { item: "camelsine", weight: 3},
                                { item: "pulsine", weight: 3},
                                { item: "sharksine", weight: 3},
                                { item: "logarithmic saw", weight: 3},
                                { item: "white noise", weight: 3},
                            ])].index;
                            if (instrument.operators[i].waveform == 3) {
                                const [pulseWidth, pulseWidthDecimalOffset] = selectWeightedRandom([
                                    { item: [1, 0], weight: 3 },
                                    { item: [3, 50], weight: 3 },
                                    { item: [5, 0], weight: 3 },
                                    { item: [7, 75], weight: 3 },
                                    { item: [10, 0], weight: 3 },
                                    { item: [13, 50], weight: 3 },
                                    { item: [15, 0], weight: 3 },
                                    { item: [18, 50], weight: 3 },
                                    { item: [20, 0], weight: 3 },
                                    { item: [25, 0], weight: 3 },
                                    { item: [30, 0], weight: 3 },
                                    { item: [34, 66], weight: 3 },
                                    { item: [40, 0], weight: 3 },
                                    { item: [45, 0], weight: 3 },
                                    { item: [50, 0], weight: 25 }, // 50%
                                    { item: [55, 0], weight: 3 },
                                    { item: [60, 0], weight: 3 },
                                    { item: [67, 33], weight: 3 },
                                    { item: [70, 0], weight: 3 },
                                    { item: [75, 0], weight: 3 },
                                    { item: [80, 0], weight: 3 },
                                    { item: [83, 50], weight: 3 },
                                    { item: [85, 0], weight: 3 },
                                    { item: [88, 50], weight: 3 },
                                    { item: [90, 0], weight: 3 },
                                    { item: [94, 25], weight: 3 },
                                    { item: [95, 0], weight: 3 },
                                    { item: [98, 50], weight: 3 },
                                    { item: [99, 0], weight: 3 },
                                ]);
                                instrument.operators[i].pulseWidth = pulseWidth;
							    instrument.operators[i].pulseWidthDecimalOffset = pulseWidthDecimalOffset;
                            }
                        }
                        if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.05) {
                            instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorFrequency"].index, i, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox bow", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                            ])].index);
                        }
                    }
                    instrument.feedbackAmplitude = (Math.pow(Math.random(), 3) * Config.operatorAmplitudeMax) | 0;
                    if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.4) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index, 0, Config.envelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "flare", weight: 2},
                                { item: "twang", weight: 2},
                                { item: "swell", weight: 2},
                                { item: "decay", weight: 2},
                                { item: "modbox click", weight: 2 },
                                { item: "modbox bow", weight: 2 },
                                { item: "modbox trill", weight: 2 },
                                { item: "modbox blip", weight: 2 },
                                { item: "wibble", weight: 2},
                                { item: "linear", weight: 2},
                                { item: "rise", weight: 2},
                                { item: "jummbox blip", weight: 2},
                        ])].index);
                    }
                } break;
                case InstrumentType.customChipWave: {
                    let randomGeneratedArray: Float32Array = new Float32Array(64);
                    let randomGeneratedArrayIntegral: Float32Array = new Float32Array(65);
                    const algorithmFunction: (wave: Float32Array, n1: number, n2: number) => void = selectWeightedRandom([
                        {item: randomRoundedWave, weight: 1},
                        {item: randomPulses, weight: 1},
                        {item: randomChip, weight: 1},
                        {item: biasedFullyRandom, weight: 1},
                        {item: randomizeWave, weight: 1}
                    ]);
                    algorithmFunction(randomGeneratedArray, 0, 64);

                    let sum: number = 0.0;
                    for (let i: number = 0; i < randomGeneratedArray.length; i++) sum += randomGeneratedArray[i];
                    const average: number = sum / randomGeneratedArray.length;
                    let cumulative: number = 0;
                    let wavePrev: number = 0;
                    for (let i: number = 0; i < randomGeneratedArray.length; i++) {
                        cumulative += wavePrev;
                        wavePrev = randomGeneratedArray[i] - average;
                        randomGeneratedArrayIntegral[i] = cumulative;
                    }
                    randomGeneratedArrayIntegral[64] = 0.0;

                    instrument.customChipWave = randomGeneratedArray;
                    instrument.customChipWaveIntegral = randomGeneratedArrayIntegral;
                } break;
                case InstrumentType.noise: {
                    instrument.chipNoise = (Math.random() * Config.chipNoises.length) | 0;
                } break;
                case InstrumentType.wavetable: {
                    let randomGeneratedArray: Float32Array[] = [];
                    let randomGeneratedArrayIntegral: Float32Array[] = [];

                    instrument.wavetableSpeed = Math.floor(Math.random() * Config.wavetableSpeedMax + 1);
                    instrument.cyclePerNote = Math.round(Math.random()) == 0 ? true : false;
                    instrument.oneShotCycle = (Math.round(Math.random()) == 0 && instrument.cyclePerNote) ? true : false;
                    instrument.interpolateWaves = Math.round(Math.random()) == 0 ? true : false;
                    instrument.currentCycle = [];
                    for (let i: number = 0; i < 32; i++) {
                        instrument.currentCycle.push(i);
                    }

                    for (let waveIndex: number = 0; waveIndex < 32; waveIndex++) {
                        randomGeneratedArray[waveIndex] = new Float32Array(64);
                        randomGeneratedArrayIntegral[waveIndex] = new Float32Array(65);
                        const algorithmFunction: (wave: Float32Array, n1: number, n2: number) => void = selectWeightedRandom([
                            {item: randomRoundedWave, weight: 1},
                            {item: randomPulses, weight: 1},
                            {item: randomChip, weight: 1},
                            {item: biasedFullyRandom, weight: 1},
                            {item: randomizeWave, weight: 1}
                        ]);
                        algorithmFunction(randomGeneratedArray[waveIndex], 0, 64);

                        let sum: number = 0.0;
                        for (let i: number = 0; i < randomGeneratedArray[waveIndex].length; i++) sum += randomGeneratedArray[waveIndex][i];
                        const average: number = sum / randomGeneratedArray[waveIndex].length;
                        let cumulative: number = 0;
                        let wavePrev: number = 0;
                        for (let i: number = 0; i < randomGeneratedArray[waveIndex].length; i++) {
                            cumulative += wavePrev;
                            wavePrev = randomGeneratedArray[waveIndex][i] - average;
                            randomGeneratedArrayIntegral[waveIndex][i] = cumulative;
                        }
                        randomGeneratedArrayIntegral[waveIndex][64] = 0.0;

                        instrument.wavetableWaves[waveIndex] = randomGeneratedArray[waveIndex];
                        instrument.wavetableIntegralWaves[waveIndex] = randomGeneratedArrayIntegral[waveIndex];
                    }
                } break;
                default: throw new Error("Unhandled pitched instrument type in random generator.");
            }
        }

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeTransition extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.transition;
        if (oldValue != newValue) {
            this._didSomething();
            instrument.transition = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
        }
    }
}

export class ChangeToggleEffects extends Change {
    constructor(doc: SongDocument, toggleFlag: number, useInstrument: Instrument | null) {
        super();
        let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (useInstrument != null)
            instrument = useInstrument;
        const oldValue: number = instrument.effects;
        const wasSelected: boolean = ((oldValue & (1 << toggleFlag)) != 0);
        const newValue: number = wasSelected ? (oldValue & (~(1 << toggleFlag))) : (oldValue | (1 << toggleFlag));
        instrument.effects = newValue;
        // As a special case, toggling the panning effect doesn't remove the preset.
        if (toggleFlag != EffectType.panning) instrument.preset = instrument.type;
        // Remove AA when distortion is turned off.
        if (toggleFlag == EffectType.distortion && wasSelected)
            instrument.aliases = false;
        if (wasSelected) instrument.clearInvalidEnvelopeTargets();
        this._didSomething();
        doc.notifier.changed();
    }
}


export class ChangePatternNumbers extends Change {
    constructor(doc: SongDocument, value: number, startBar: number, startChannel: number, width: number, height: number) {
        super();
        if (value > doc.song.patternsPerChannel) throw new Error("invalid pattern");

        for (let bar: number = startBar; bar < startBar + width; bar++) {
            for (let channelIndex: number = startChannel; channelIndex < startChannel + height; channelIndex++) {
                if (doc.song.channels[channelIndex].bars[bar] != value) {
                    doc.song.channels[channelIndex].bars[bar] = value;
                    this._didSomething();
                }
            }
        }

        //Make mod channels shift viewed instrument over when pattern numbers change
        if (startChannel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
            const pattern: Pattern | null = doc.getCurrentPattern();
            if (pattern != null) {
                doc.viewedInstrument[startChannel] = pattern.instruments[0];
            }
            else {
                doc.viewedInstrument[startChannel] = 0;
            }
        }

        doc.notifier.changed();
    }
}

export class ChangeBarCount extends Change {
    constructor(doc: SongDocument, newValue: number, atBeginning: boolean) {
        super();
        if (doc.song.barCount != newValue) {
            for (const channel of doc.song.channels) {
                if (atBeginning) {
                    while (channel.bars.length < newValue) {
                        channel.bars.unshift(0);
                    }
                    if (doc.song.barCount > newValue) {
                        channel.bars.splice(0, doc.song.barCount - newValue);
                    }
                } else {
                    while (channel.bars.length < newValue) {
                        channel.bars.push(0);
                    }
                    channel.bars.length = newValue;
                }
            }

            if (atBeginning) {
                const diff: number = newValue - doc.song.barCount;
                doc.bar = Math.max(0, doc.bar + diff);
                if (diff < 0 || doc.barScrollPos > 0) {
                    doc.barScrollPos = Math.max(0, doc.barScrollPos + diff);
                }
                doc.song.loopStart = Math.max(0, doc.song.loopStart + diff);
            }
            doc.bar = Math.min(doc.bar, newValue - 1);
            doc.song.loopLength = Math.min(newValue, doc.song.loopLength);
            doc.song.loopStart = Math.min(newValue - doc.song.loopLength, doc.song.loopStart);
            doc.song.barCount = newValue;
            doc.notifier.changed();

            this._didSomething();
        }
    }
}

export class ChangeInsertBars extends Change {
    constructor(doc: SongDocument, start: number, count: number) {
        super();

        const newLength: number = Math.min(Config.barCountMax, doc.song.barCount + count);
        count = newLength - doc.song.barCount;
        if (count == 0) return;

        for (const channel of doc.song.channels) {
            while (channel.bars.length < newLength) {
                channel.bars.splice(start, 0, 0);
            }
        }
        doc.song.barCount = newLength;

        doc.bar += count;
        doc.barScrollPos += count;
        if (doc.song.loopStart >= start) {
            doc.song.loopStart += count;
        } else if (doc.song.loopStart + doc.song.loopLength >= start) {
            doc.song.loopLength += count;
        }

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeDeleteBars extends Change {
    constructor(doc: SongDocument, start: number, count: number) {
        super();

        for (const channel of doc.song.channels) {
            channel.bars.splice(start, count);
            if (channel.bars.length == 0) channel.bars.push(0);
        }
        doc.song.barCount = Math.max(1, doc.song.barCount - count);

        doc.bar = Math.max(0, doc.bar - count);

        doc.barScrollPos = Math.max(0, doc.barScrollPos - count);
        if (doc.song.loopStart >= start) {
            doc.song.loopStart = Math.max(0, doc.song.loopStart - count);
        } else if (doc.song.loopStart + doc.song.loopLength > start) {
            doc.song.loopLength -= count;
        }
        doc.song.loopLength = Math.max(1, Math.min(doc.song.barCount - doc.song.loopStart, doc.song.loopLength));

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeLimiterSettings extends Change {
    constructor(doc: SongDocument, limitRatio: number, compressionRatio: number, limitThreshold: number, compressionThreshold: number, limitRise: number, limitDecay: number, masterGain: number) {
        super();

        // This check causes issues with the state change handler because it gets superceded by whenupdated when the limiter prompt closes for some reason, causing the state to revert. I think it's because the notifier change needs to happen right as the prompt closes.
        //if (limitRatio != doc.song.limitRatio || compressionRatio != doc.song.compressionRatio || limitThreshold != doc.song.limitThreshold || compressionThreshold != doc.song.compressionThreshold || limitRise != doc.song.limitRise || limitDecay != doc.song.limitDecay) {

        doc.song.limitRatio = limitRatio;
        doc.song.compressionRatio = compressionRatio;
        doc.song.limitThreshold = limitThreshold;
        doc.song.compressionThreshold = compressionThreshold;
        doc.song.limitRise = limitRise;
        doc.song.limitDecay = limitDecay;
        doc.song.masterGain = masterGain;

        doc.notifier.changed();
        this._didSomething();
        //}
    }
}

export class ChangeChannelOrder extends Change {
    constructor(doc: SongDocument, selectionMin: number, selectionMax: number, offset: number) {
        super();
        // Change the order of two channels by swapping.
        doc.song.channels.splice(selectionMin + offset, 0, ...doc.song.channels.splice(selectionMin, selectionMax - selectionMin + 1));

        // Update mods for each channel
        selectionMax = Math.max(selectionMax, selectionMin);
        for (let channelIndex: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channelIndex < doc.song.getChannelCount(); channelIndex++) {
            for (let instrumentIdx: number = 0; instrumentIdx < doc.song.channels[channelIndex].instruments.length; instrumentIdx++) {
                let instrument: Instrument = doc.song.channels[channelIndex].instruments[instrumentIdx];
                for (let i: number = 0; i < Config.modCount; i++) {
                    if (instrument.modChannels[i] >= selectionMin && instrument.modChannels[i] <= selectionMax) {
                        instrument.modChannels[i] += offset;
                    }
                    else if (instrument.modChannels[i] >= selectionMin + offset && instrument.modChannels[i] <= selectionMax + offset) {
                        instrument.modChannels[i] -= offset * (selectionMax - selectionMin + 1);
                    }
                }
            }
        }

        doc.notifier.changed();
        this._didSomething();

    }
}

export class ChangeChannelCount extends Change {
    constructor(doc: SongDocument, newPitchChannelCount: number, newNoiseChannelCount: number, newModChannelCount: number) {
        super();
        if (doc.song.pitchChannelCount != newPitchChannelCount || doc.song.noiseChannelCount != newNoiseChannelCount || doc.song.modChannelCount != newModChannelCount) {
            const newChannels: Channel[] = [];

            function changeGroup(newCount: number, oldCount: number, newStart: number, oldStart: number, octave: number, isNoise: boolean, isMod: boolean): void {
                for (let i: number = 0; i < newCount; i++) {
                    const channelIndex = i + newStart;
                    const oldChannel = i + oldStart;
                    if (i < oldCount) {
                        newChannels[channelIndex] = doc.song.channels[oldChannel];
                    } else {
                        newChannels[channelIndex] = new Channel();
                        newChannels[channelIndex].octave = octave;
                        for (let j: number = 0; j < Config.instrumentCountMin; j++) {
                            const instrument: Instrument = new Instrument(isNoise, isMod);
                            if (!isMod) {
                                const presetValue: number = pickRandomPresetValue(isNoise);
                                const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
                                instrument.fromJsonObject(preset.settings, isNoise, isMod, doc.song.rhythm == 0 || doc.song.rhythm == 2, doc.song.rhythm >= 2);
                                instrument.effects |= (1 << EffectType.panning);
                                instrument.preset = presetValue;
                            }
                            newChannels[channelIndex].instruments[j] = instrument;
                        }
                        for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
                            newChannels[channelIndex].patterns[j] = new Pattern();
                        }
                        for (let j: number = 0; j < doc.song.barCount; j++) {
                            newChannels[channelIndex].bars[j] = 0;
                        }
                    }
                }
            }

            changeGroup(newPitchChannelCount, doc.song.pitchChannelCount, 0, 0, 3, false, false);
            changeGroup(newNoiseChannelCount, doc.song.noiseChannelCount, newPitchChannelCount, doc.song.pitchChannelCount, 0, true, false);
            changeGroup(newModChannelCount, doc.song.modChannelCount, newNoiseChannelCount + newPitchChannelCount, doc.song.pitchChannelCount + doc.song.noiseChannelCount, 0, false, true);

            let oldPitchCount: number = doc.song.pitchChannelCount;
            doc.song.pitchChannelCount = newPitchChannelCount;
            doc.song.noiseChannelCount = newNoiseChannelCount;
            doc.song.modChannelCount = newModChannelCount;

            for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
                doc.song.channels[channelIndex] = newChannels[channelIndex];
            }
            doc.song.channels.length = doc.song.getChannelCount();

            doc.channel = Math.min(doc.channel, newPitchChannelCount + newNoiseChannelCount + newModChannelCount - 1);

            // Determine if any mod instruments now refer to an invalid channel. Unset them if so
            for (let channelIndex: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channelIndex < doc.song.getChannelCount(); channelIndex++) {
                for (let instrumentIdx: number = 0; instrumentIdx < doc.song.channels[channelIndex].instruments.length; instrumentIdx++) {
                    for (let mod: number = 0; mod < Config.modCount; mod++) {

                        let instrument: Instrument = doc.song.channels[channelIndex].instruments[instrumentIdx];
                        let modChannel: number = instrument.modChannels[mod];

                        // Boundary checking
                        if ((modChannel >= doc.song.pitchChannelCount && modChannel < oldPitchCount) || modChannel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
                            instrument.modulators[mod] = Config.modulators.dictionary["none"].index;
                        }

                        // Bump indices - new pitch channel added, bump all noise mods.
                        if (modChannel >= oldPitchCount && oldPitchCount < newPitchChannelCount) {
                            instrument.modChannels[mod] += newPitchChannelCount - oldPitchCount;
                        }
                    }
                }
            }

            doc.notifier.changed();

            ColorConfig.resetColors();

            this._didSomething();
        }
    }
}

export class ChangeAddChannel extends ChangeGroup {
	constructor(doc: SongDocument, index: number, isNoise: boolean, isMod: boolean) {
		super();
		const newPitchChannelCount: number = doc.song.pitchChannelCount + (isNoise || isMod ? 0 : 1);
        const newNoiseChannelCount: number = doc.song.noiseChannelCount + (!isNoise || isMod ? 0 : 1);
        const newModChannelCount: number = doc.song.modChannelCount + (isNoise || !isMod ? 0 : 1);

        if (newPitchChannelCount <= Config.pitchChannelCountMax && newNoiseChannelCount <= Config.noiseChannelCountMax && newModChannelCount <= Config.modChannelCountMax) {
            const addedChannelIndex: number = isMod ? doc.song.pitchChannelCount + doc.song.noiseChannelCount + doc.song.modChannelCount : (isNoise ? doc.song.pitchChannelCount + doc.song.noiseChannelCount : doc.song.pitchChannelCount);
            this.append(new ChangeChannelCount(doc, newPitchChannelCount, newNoiseChannelCount, newModChannelCount));
            if (addedChannelIndex - 1 >= index) {
                this.append(new ChangeChannelOrder(doc, index, addedChannelIndex - 1, 1));
            }

            doc.synth.computeLatestModValues();
            doc.recalcChannelNames = true;
		}
	}
}

export class ChangeRemoveChannel extends ChangeGroup {
	constructor(doc: SongDocument, minIndex: number, maxIndex: number) {
        super();

        const oldMax: number = maxIndex;

        // Update modulators - if a higher index was removed, shift down
        for (let modChannel: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; modChannel < doc.song.channels.length; modChannel++) {
            for (let instrumentIndex: number = 0; instrumentIndex < doc.song.channels[modChannel].instruments.length; instrumentIndex++) {
                const modInstrument: Instrument = doc.song.channels[modChannel].instruments[instrumentIndex];
                for (let mod: number = 0; mod < Config.modCount; mod++) {
                    if (modInstrument.modChannels[mod] >= minIndex && modInstrument.modChannels[mod] <= oldMax) {
                        this.append(new ChangeModChannel(doc, mod, 0, modInstrument));
                    }
                    else if (modInstrument.modChannels[mod] > oldMax) {
                        this.append(new ChangeModChannel(doc, mod, modInstrument.modChannels[mod] - (oldMax - minIndex + 1) + 2, modInstrument));
                    }
                }
            }
        }

		while (maxIndex >= minIndex) {
            const isNoise: boolean = doc.song.getChannelIsNoise(maxIndex);
            const isMod: boolean = doc.song.getChannelIsMod(maxIndex);
			doc.song.channels.splice(maxIndex, 1);
            if (isNoise) {
                doc.song.noiseChannelCount--;
            } else if (isMod) {
                doc.song.modChannelCount--;
            } else {
				doc.song.pitchChannelCount--;
			}
            maxIndex--;
		}
		
        if (doc.song.pitchChannelCount < Config.pitchChannelCountMin) {
            this.append(new ChangeChannelCount(doc, Config.pitchChannelCountMin, doc.song.noiseChannelCount, doc.song.modChannelCount));
        }

        ColorConfig.resetColors();
        doc.recalcChannelNames = true;

		this.append(new ChangeChannelBar(doc, Math.max(0, minIndex - 1), doc.bar));

        doc.synth.computeLatestModValues();

		this._didSomething();
		doc.notifier.changed();
	}
}

export class ChangeChannelBar extends Change {
    constructor(doc: SongDocument, newChannel: number, newBar: number, silently: boolean = false) {
        super();
        const oldChannel: number = doc.channel;
        const oldBar: number = doc.bar;
        doc.channel = newChannel;
        doc.bar = newBar;
        if (!silently) {
            doc.selection.scrollToSelectedPattern();
        }
        // Mod channels always jump to viewing the active instrument for the mod.
        if (doc.song.getChannelIsMod(doc.channel)) {
            const pattern: Pattern | null = doc.song!.getPattern(doc.channel, doc.bar);
            if (pattern != null) doc.viewedInstrument[doc.channel] = pattern.instruments[0];
        }
        doc.notifier.changed();
        if (oldChannel != newChannel || oldBar != newBar) {
            this._didSomething();
        }
    }
}

export class ChangeUnison extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.unison;
        if (oldValue != newValue) {
            instrument.unison = newValue;
            instrument.unisonVoices = Config.unisons[instrument.unison].voices;
            instrument.unisonSpread = Config.unisons[instrument.unison].spread;
            instrument.unisonOffset = Config.unisons[instrument.unison].offset;
            instrument.unisonExpression = Config.unisons[instrument.unison].expression;
            instrument.unisonSign = Config.unisons[instrument.unison].sign;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonVoices extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {            
            instrument.unisonVoices = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonSpread extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonSpread = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonOffset extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonOffset = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonExpression extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonExpression = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonSign extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonSign = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChord extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.chord;
        if (oldValue != newValue) {
            this._didSomething();
            instrument.chord = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
        }
    }
}

export class ChangeVibrato extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.vibrato;
        if (oldValue != newValue) {
            instrument.vibrato = newValue;
            instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
            instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
            instrument.vibratoSpeed = 10; // default
            instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoDepth extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevVibrato: number = instrument.vibrato;
        doc.synth.unsetMod(Config.modulators.dictionary["vibrato depth"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoDepth = newValue / 25;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        doc.synth.unsetMod(Config.modulators.dictionary["envelope speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        instrument.envelopeSpeed = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangePerEnvelopeSpeed extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].envelopeSpeed = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetEnvelopeSpeed extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].envelopeSpeed = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDiscreteEnvelope extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.envelopes[envelopeIndex].discrete;
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].discrete = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDrumsetDiscreteEnvelope extends Change {
    constructor(doc: SongDocument, drumIndex: number, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.drumsetEnvelopes[drumIndex].discrete;
        if (oldValue != newValue) {
            instrument.drumsetEnvelopes[drumIndex].discrete = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeLowerBound extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].lowerBound = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetLowerBound extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].lowerBound = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeUpperBound extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].upperBound = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetUpperBound extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].upperBound = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeEnvelopeDelay extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].delay = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetEnvelopeDelay extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].delay = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangePitchEnvelopeStart extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].pitchStart = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangePitchEnvelopeEnd extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].pitchEnd = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangePitchAmplify extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.envelopes[envelopeIndex].pitchAmplify;
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].pitchAmplify = newValue;
            // Extra step: Toggle pitchBounce to be off if pitchAmplify is on.
            if (instrument.envelopes[envelopeIndex].pitchAmplify && instrument.envelopes[envelopeIndex].pitchBounce)
                instrument.envelopes[envelopeIndex].pitchBounce = false;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangePitchBounce extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.envelopes[envelopeIndex].pitchBounce;
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].pitchBounce = newValue;
            // Extra step: Toggle pitchAmplify to be off if pitchBounce is on.
            if (instrument.envelopes[envelopeIndex].pitchBounce && instrument.envelopes[envelopeIndex].pitchAmplify)
                instrument.envelopes[envelopeIndex].pitchAmplify = false;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopePosition extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].phase = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetEnvelopePosition extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].phase = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeMeasurementType extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: boolean, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].measurementType = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDrumsetMeasurementType extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: boolean, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (oldValue != newValue) {
            instrument.drumsetEnvelopes[drumIndex].measurementType = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeClapMirrorAmount extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].mirrorAmount = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetClapMirrorAmount extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].mirrorAmount = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeEnvelopeTargetRange extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.envelopes[envelopeIndex].alternateRange;
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].alternateRange = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeLFOEnvelopeShape extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].LFOSettings.LFOShape = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDrumsetLFOEnvelopeShape extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (oldValue != newValue) {
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOShape = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeAccelerationEnabled extends Change {
    constructor(doc: SongDocument, envelopeIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox == 1) { // Off
            instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        } else { // On
            instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox = 1;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeLooping extends Change {
    constructor(doc: SongDocument, envelopeIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox == 2) { // Off
            instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        } else { // On
            instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox = 2;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeIgnorance extends Change {
    constructor(doc: SongDocument, envelopeIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox == 3) { // Off
            instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        } else { // On
            instrument.envelopes[envelopeIndex].LFOSettings.LFOActiveCheckbox = 3;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDrumsetEnvelopeAccelerationEnabled extends Change {
    constructor(doc: SongDocument, drumIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox == 1) { // Off
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        } else { // On
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox = 1;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDrumsetEnvelopeLooping extends Change {
    constructor(doc: SongDocument, drumIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox == 2) { // Off
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        } else { // On
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox = 2;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDrumsetEnvelopeIgnorance extends Change {
    constructor(doc: SongDocument, drumIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox == 3) { // Off
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        } else { // On
            instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOActiveCheckbox = 3;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeAcceleration extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].LFOSettings.LFOAcceleration = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetEnvelopeAcceleration extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOAcceleration = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeLFOEnvelopePulseWidth extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].LFOSettings.LFOPulseWidth = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetLFOEnvelopePulseWidth extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOPulseWidth = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeLFOEnvelopeTrapezoidRatio extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].LFOSettings.LFOTrapezoidRatio = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetLFOEnvelopeTrapezoidRatio extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOTrapezoidRatio = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeLFOEnvelopeStairsStepAmount extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[envelopeIndex].LFOSettings.LFOStepAmount = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDrumsetLFOEnvelopeStairsStepAmount extends Change {
    constructor(doc: SongDocument, drumIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.drumsetEnvelopes[drumIndex].LFOSettings.LFOStepAmount = newValue;
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeCustomEnvelopePointHeights extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, oldArray: number[], newArray: number[]) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        for (let i = 0; i < instrument.envelopes[envelopeIndex].customEnvGridWidth; i++) {
            instrument.envelopes[envelopeIndex].customEnvGridPoints[i].height = newArray[i];
        }
        instrument.preset = instrument.type;
        doc.notifier.changed();
        if (oldArray != newArray) this._didSomething();
    }
}

export class ChangeVibratoSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevVibrato: number = instrument.vibrato;
        doc.synth.unsetMod(Config.modulators.dictionary["vibrato speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoSpeed = newValue;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoDelay extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        let prevVibrato: number = instrument.vibrato;
        doc.synth.unsetMod(Config.modulators.dictionary["vibrato delay"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoDelay = newValue;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoType extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.vibratoType;
        let prevVibrato: number = instrument.vibrato;

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoType = newValue;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeArpeggioSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.arpeggioSpeed = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["arp speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeStrumSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.strumSpeed = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["strum speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeSlideSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.slideSpeed = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["slide speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeFastTwoNoteArp extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.fastTwoNoteArp;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.fastTwoNoteArp = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeArpeggioPattern extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.arpeggioPattern;
        if (oldValue != newValue) {
            this._didSomething();
            instrument.arpeggioPattern = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
        }
    }
}

export class ChangeClicklessTransition extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.clicklessTransition;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.clicklessTransition = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeContinueThruPattern extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.continueThruPattern;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.continueThruPattern = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeAliasing extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.aliases;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.aliases = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeSongKeyAffected extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: boolean = instrument.songKeyAffected;
        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.songKeyAffected = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeSongDetuneAffected extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: boolean = instrument.songDetuneAffected;
        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.songDetuneAffected = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeFMUsingOperatorOffsets extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: boolean = instrument.FMUsesOperatorOffsets;
        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.FMUsesOperatorOffsets = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeSpectrum extends Change {
    constructor(doc: SongDocument, instrument: Instrument, spectrumWave: SpectrumWave) {
        super();
        spectrumWave.markCustomWaveDirty();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeHarmonics extends Change {
    constructor(doc: SongDocument, instrument: Instrument, harmonicsWave: HarmonicsWave) {
        super();
        harmonicsWave.markCustomWaveDirty();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeDrumsetEnvelope extends Change {
    constructor(doc: SongDocument, drumIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.drumsetEnvelopes[drumIndex].envelope;
        if (oldValue != newValue) {
            instrument.drumsetEnvelopes[drumIndex].envelope = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

class ChangeInstrumentSlider extends Change {
    protected _instrument: Instrument;
    constructor(private _doc: SongDocument) {
        super();
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
    }

    public commit(): void {
        if (!this.isNoop()) {
            this._instrument.preset = this._instrument.type;
            this._doc.notifier.changed();
        }
    }
}

export class ChangePulseWidth extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.pulseWidth = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["pulse width"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeSupersawDynamism extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.supersawDynamism = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["dynamism"].index, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}
export class ChangeSupersawSpread extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.supersawSpread = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["spread"].index, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}
export class ChangeSupersawShape extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.supersawShape = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["shape"].index, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangePitchShift extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.pitchShift = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDetune extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.detune = newValue + Config.detuneCenter;
        doc.notifier.changed();
        doc.synth.unsetMod(Config.modulators.dictionary["detune"].index, doc.channel, doc.getCurrentInstrument());
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeWavefoldBounds extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.wavefoldBounds = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeDistortion extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.distortion = newValue;
        doc.notifier.changed();
        doc.synth.unsetMod(Config.modulators.dictionary["distortion"].index, doc.channel, doc.getCurrentInstrument());
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeClipBounds extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.clipBounds = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeBitcrusherFreq extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.bitcrusherFreq = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["bit crush"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeBitcrusherQuantization extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        doc.synth.unsetMod(Config.modulators.dictionary["freq crush"].index, doc.channel, doc.getCurrentInstrument());
        this._instrument.bitcrusherQuantization = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeStringSustain extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.stringSustain = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["sustain"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeWavetableSpeed extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.wavetableSpeed = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeWaveInterpolation extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.interpolateWaves;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.interpolateWaves = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeCyclePerNote extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.cyclePerNote;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.cyclePerNote = newValue;
            if (instrument.cyclePerNote == false) {
                instrument.oneShotCycle = false;
            }
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeOneShotCycle extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.oneShotCycle;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.oneShotCycle = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeStringSustainType extends Change {
	constructor(doc: SongDocument, newValue: SustainType) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: SustainType = instrument.stringSustainType;
		if (oldValue != newValue) {
			instrument.stringSustainType = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeEQFilterType extends Change {
    constructor(doc: SongDocument, instrument: Instrument, newValue: boolean) {
        super();
        instrument.eqFilterType = newValue;
        if (newValue == true) { // To Simple - clear eq filter
            instrument.eqFilter.reset();
            instrument.tmpEqFilterStart = instrument.eqFilter;
            instrument.tmpEqFilterEnd = null;
        }
        else {
            // To Advanced - convert filter
            instrument.eqFilter.convertLegacySettings(instrument.eqFilterSimpleCut, instrument.eqFilterSimplePeak, Config.envelopes.dictionary["none"]);
            instrument.tmpEqFilterStart = instrument.eqFilter;
            instrument.tmpEqFilterEnd = null;
        }
        instrument.clearInvalidEnvelopeTargets();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeNoteFilterType extends Change {
    constructor(doc: SongDocument, instrument: Instrument, newValue: boolean) {
        super();
        instrument.noteFilterType = newValue;
        if (newValue == true) { // To Simple - clear note filter, kill modulators
            instrument.noteFilter.reset();
            instrument.tmpNoteFilterStart = instrument.noteFilter;
            instrument.tmpNoteFilterEnd = null;
        }
        else {
            // To Advanced - convert filter, kill modulators
            instrument.noteFilter.convertLegacySettings(instrument.noteFilterSimpleCut, instrument.noteFilterSimplePeak, Config.envelopes.dictionary["none"]);
            instrument.tmpNoteFilterStart = instrument.noteFilter;
            instrument.tmpNoteFilterEnd = null;
        }
        instrument.clearInvalidEnvelopeTargets();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeEQFilterSimpleCut extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.eqFilterSimpleCut = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["eq filt cut"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeEQFilterSimplePeak extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.eqFilterSimplePeak = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["eq filt peak"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeNoteFilterSimpleCut extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.noteFilterSimpleCut = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["note filt cut"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeNoteFilterSimplePeak extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.noteFilterSimplePeak = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["note filt peak"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeFilterAddPoint extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _filterSettings: FilterSettings;
    private _point: FilterControlPoint;
    private _index: number;
    private _envelopeTargetsAdd: number[] = [];
    private _envelopeIndicesAdd: number[] = [];
    private _envelopeTargetsRemove: number[] = [];
    private _envelopeIndicesRemove: number[] = [];
    constructor(doc: SongDocument, filterSettings: FilterSettings, point: FilterControlPoint, index: number, isNoteFilter: boolean, deletion: boolean = false) {
        super(deletion);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = deletion ? this._instrument.preset : this._instrument.type;
        this._instrumentPrevPreset = deletion ? this._instrument.type : this._instrument.preset;
        this._filterSettings = filterSettings;
        this._point = point;
        this._index = index;

        for (let envelopeIndex: number = 0; envelopeIndex < this._instrument.envelopeCount; envelopeIndex++) {
            let target: number = this._instrument.envelopes[envelopeIndex].target;
            let targetIndex: number = this._instrument.envelopes[envelopeIndex].index;
            this._envelopeTargetsAdd.push(target);
            this._envelopeIndicesAdd.push(targetIndex);
            if (deletion) {
                // When deleting a filter control point, find all envelopes that targeted that
                // point and clear them, and all envelopes that targeted later points and
                // decrement those to keep them in sync with the new list of points.
                const automationTarget: AutomationTarget = Config.instrumentAutomationTargets[target];
                if (automationTarget.isFilter && (automationTarget.effect == EffectType.noteFilter) == isNoteFilter) {
                    if (automationTarget.maxCount == Config.filterMaxPoints) {
                        if (targetIndex == index) {
                            target = Config.instrumentAutomationTargets.dictionary["none"].index;
                            targetIndex = 0;
                        } else if (targetIndex > index) {
                            targetIndex--;
                        }
                    } else {
                        if (filterSettings.controlPointCount <= 1) {
                            target = Config.instrumentAutomationTargets.dictionary["none"].index;
                            targetIndex = 0;
                        }
                    }
                }
            }
            this._envelopeTargetsRemove.push(target);
            this._envelopeIndicesRemove.push(targetIndex);
        }

        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._filterSettings.controlPoints.splice(this._index, 0, this._point);
        this._filterSettings.controlPointCount++;
        this._filterSettings.controlPoints.length = this._filterSettings.controlPointCount;
        this._instrument.preset = this._instrumentNextPreset;
        for (let envelopeIndex: number = 0; envelopeIndex < this._instrument.envelopeCount; envelopeIndex++) {
            this._instrument.envelopes[envelopeIndex].target = this._envelopeTargetsAdd[envelopeIndex];
            this._instrument.envelopes[envelopeIndex].index = this._envelopeIndicesAdd[envelopeIndex];
        }
        this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
        this._instrument.tmpEqFilterEnd = null;
        this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
        this._instrument.tmpNoteFilterEnd = null;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._filterSettings.controlPoints.splice(this._index, 1);
        this._filterSettings.controlPointCount--;
        this._filterSettings.controlPoints.length = this._filterSettings.controlPointCount;
        this._instrument.preset = this._instrumentPrevPreset;
        for (let envelopeIndex: number = 0; envelopeIndex < this._instrument.envelopeCount; envelopeIndex++) {
            this._instrument.envelopes[envelopeIndex].target = this._envelopeTargetsRemove[envelopeIndex];
            this._instrument.envelopes[envelopeIndex].index = this._envelopeIndicesRemove[envelopeIndex];
        }
        this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
        this._instrument.tmpEqFilterEnd = null;
        this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
        this._instrument.tmpNoteFilterEnd = null;
        this._doc.notifier.changed();
    }
}

export class FilterMoveData {
    public point: FilterControlPoint;
    public freq: number;
    public gain: number;

    constructor(usePoint: FilterControlPoint, useFreq: number, useGain: number) {
        this.point = usePoint;
        this.freq = useFreq;
        this.gain = useGain;
    }
}

export class ChangeFilterMovePoint extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _point: FilterControlPoint;
    private _oldFreq: number;
    private _newFreq: number;
    private _oldGain: number;
    private _newGain: number;
    public useNoteFilter: boolean;
    public pointIndex: number;
    public pointType: FilterType;
    constructor(doc: SongDocument, point: FilterControlPoint, oldFreq: number, newFreq: number, oldGain: number, newGain: number, useNoteFilter: boolean, pointIndex: number) {
        super(false);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = this._instrument.type;
        this._instrumentPrevPreset = this._instrument.preset;
        this._point = point;
        this._oldFreq = oldFreq;
        this._newFreq = newFreq;
        this._oldGain = oldGain;
        this._newGain = newGain;
        this.useNoteFilter = useNoteFilter;
        this.pointIndex = pointIndex;
        this.pointType = point.type;
        this._didSomething();
        this.redo();
    }

    public getMoveData(beforeChange: boolean): FilterMoveData {
        if (beforeChange) {
            return new FilterMoveData(this._point, this._oldFreq, this._oldGain);
        }
        return new FilterMoveData(this._point, this._newFreq, this._newGain);
    }

    protected _doForwards(): void {
        this._point.freq = this._newFreq;
        this._point.gain = this._newGain;
        this._instrument.preset = this._instrumentNextPreset;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._point.freq = this._oldFreq;
        this._point.gain = this._oldGain;
        this._instrument.preset = this._instrumentPrevPreset;
        this._doc.notifier.changed();
    }
}

export class ChangeFilterSettings extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _filterSettings: FilterSettings;
    private _subFilters: (FilterSettings | null)[];
    private _oldSubFilters: (FilterSettings | null)[];
    private _oldSettings: FilterSettings;
    private _useNoteFilter: boolean;
    constructor(doc: SongDocument, settings: FilterSettings, oldSettings: FilterSettings, useNoteFilter: boolean, subFilters: (FilterSettings | null)[] | null = null, oldSubFilters: (FilterSettings | null)[] | null = null) {
        super(false);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = this._instrument.type;
        this._instrumentPrevPreset = this._instrument.preset;
        this._oldSettings = oldSettings;
        this._useNoteFilter = useNoteFilter;
        this._filterSettings = settings;
        if (subFilters != null && oldSubFilters != null) {
            this._subFilters = subFilters;
            this._oldSubFilters = oldSubFilters;
        }
        this._instrument.clearInvalidEnvelopeTargets();
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {

        if (this._useNoteFilter) {
            this._instrument.noteFilter = this._filterSettings;
            if (this._subFilters != null)
                this._instrument.noteSubFilters = this._subFilters;
            this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
            this._instrument.tmpNoteFilterEnd = null;
        } else {
            this._instrument.eqFilter = this._filterSettings;
            if (this._subFilters != null)
                this._instrument.eqSubFilters = this._subFilters;
            this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
            this._instrument.tmpEqFilterEnd = null;
        }

        this._instrument.preset = this._instrumentNextPreset;
        this._instrument.clearInvalidEnvelopeTargets();
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        if (this._useNoteFilter) {
            this._instrument.noteFilter = this._oldSettings;
            if (this._oldSubFilters != null)
                this._instrument.noteSubFilters = this._oldSubFilters;
            this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
            this._instrument.tmpNoteFilterEnd = null;
        } else {
            this._instrument.eqFilter = this._oldSettings;
            if (this._oldSubFilters != null)
                this._instrument.eqSubFilters = this._oldSubFilters;
            this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
            this._instrument.tmpEqFilterEnd = null;
        }
        this._instrument.preset = this._instrumentPrevPreset;
        this._instrument.clearInvalidEnvelopeTargets();
        this._doc.notifier.changed();
    }
}

export class ChangeFadeInOut extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _oldFadeIn: number;
    private _oldFadeOut: number;
    private _newFadeIn: number;
    private _newFadeOut: number;
    constructor(doc: SongDocument, fadeIn: number, fadeOut: number) {
        super(false);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = this._instrument.type;
        this._instrumentPrevPreset = this._instrument.preset;
        this._oldFadeIn = this._instrument.fadeIn;
        this._oldFadeOut = this._instrument.fadeOut;
        this._newFadeIn = fadeIn;
        this._newFadeOut = fadeOut;
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._instrument.fadeIn = this._newFadeIn;
        this._instrument.fadeOut = this._newFadeOut;
        this._instrument.preset = this._instrumentNextPreset;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._instrument.fadeIn = this._oldFadeIn;
        this._instrument.fadeOut = this._oldFadeOut;
        this._instrument.preset = this._instrumentPrevPreset;
        this._doc.notifier.changed();
    }
}

export class ChangeAlgorithm extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.algorithm;
        if (oldValue != newValue) {
            instrument.algorithm = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeFeedbackType extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.feedbackType;
        if (oldValue != newValue) {
            instrument.feedbackType = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class Change6OpAlgorithm extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.algorithm6Op;
        if (oldValue != newValue) {
            instrument.algorithm6Op = newValue;
            if (newValue != 0) {
                instrument.customAlgorithm.fromPreset(newValue);
            }
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class Change6OpFeedbackType extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.feedbackType6Op;
        if (oldValue != newValue) {
            instrument.feedbackType6Op = newValue;
            if (newValue != 0) {
                instrument.customFeedbackType.fromPreset(newValue);
            }
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeOperatorWaveform extends Change {
    constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.operators[operatorIndex].waveform;
        if (oldValue != newValue) {
            instrument.operators[operatorIndex].waveform = newValue;
            instrument.clearInvalidEnvelopeTargets(); // For adding or removing the FMpwm envelope target when needed.
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeOperatorPulseWidth extends Change {
    public operatorIndex: number = 0;
    constructor(doc: SongDocument, operatorIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        this.operatorIndex = operatorIndex;
        instrument.operators[operatorIndex].pulseWidth = newValue;
        instrument.operators[operatorIndex].pulseWidthDecimalOffset = 0;
        doc.synth.unsetMod(Config.modulators.dictionary["fm pwm 1"].index + operatorIndex, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeOperatorFrequency extends Change {
    constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.operators[operatorIndex].frequency;
        if (oldValue != newValue) {
            instrument.operators[operatorIndex].frequency = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeOperatorAmplitude extends ChangeInstrumentSlider {
    public operatorIndex: number = 0;
    constructor(doc: SongDocument, operatorIndex: number, oldValue: number, newValue: number) {
        super(doc);
        this.operatorIndex = operatorIndex;
        this._instrument.operators[operatorIndex].amplitude = newValue;
        // Not used currently as mod is implemented as multiplicative
        //doc.synth.unsetMod(ModSetting.mstFMSlider1 + operatorIndex, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeFeedbackAmplitude extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.feedbackAmplitude = newValue;
        // Not used currently as mod is implemented as multiplicative
        //doc.synth.unsetMod(ModSetting.mstFMFeedback, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeAddChannelInstrument extends Change {
    constructor(doc: SongDocument) {
        super();
        const channel: Channel = doc.song.channels[doc.channel];
        const isNoise: boolean = doc.song.getChannelIsNoise(doc.channel);
        const isMod: boolean = doc.song.getChannelIsMod(doc.channel);
        const maxInstruments: number = doc.song.getMaxInstrumentsPerChannel();
        if (channel.instruments.length >= maxInstruments) return;
        const presetValue: number = pickRandomPresetValue(isNoise);
        const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
        const instrument: Instrument = new Instrument(isNoise, isMod);
        instrument.fromJsonObject(preset.settings, isNoise, isMod, false, false, 1);
        instrument.effects |= (1 << EffectType.panning);
        instrument.preset = presetValue;
        instrument.volume = 0;
        channel.instruments.push(instrument);
        if (!isMod) { // Mod channels lose information when changing set instrument
            doc.viewedInstrument[doc.channel] = channel.instruments.length - 1;
        }

        // Determine if any mod instruments were setting 'all' or 'active'. If so, bump indices since there is now a new instrument in the list.
        for (let channelIndex: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channelIndex < doc.song.getChannelCount(); channelIndex++) {
            for (let instrumentIndex: number = 0; instrumentIndex < doc.song.channels[channelIndex].instruments.length; instrumentIndex++) {
                for (let mod: number = 0; mod < Config.modCount; mod++) {

                    let instrument: Instrument = doc.song.channels[channelIndex].instruments[instrumentIndex];
                    let modInstrument: number = instrument.modInstruments[mod];
                    let modChannel: number = instrument.modChannels[mod];

                    if (modChannel == doc.channel && modInstrument >= doc.song.channels[modChannel].instruments.length-1 ) {
                        instrument.modInstruments[mod]++;
                    }
                }
            }
        }
        // Also, make synth re-compute mod values, since 'all'/'active' mods now retroactively apply to this new instrument.
        doc.synth.computeLatestModValues();

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeRemoveChannelInstrument extends Change {
    constructor(doc: SongDocument) {
        super();
        const channel: Channel = doc.song.channels[doc.channel];
        if (channel.instruments.length <= Config.instrumentCountMin) return;
        const removedIndex: number = doc.viewedInstrument[doc.channel];
        channel.instruments.splice(removedIndex, 1);
        if (doc.song.patternInstruments) {
            for (const pattern of channel.patterns) {
                for (let i: number = 0; i < pattern.instruments.length; i++) {
                    if (pattern.instruments[i] == removedIndex) {
                        pattern.instruments.splice(i, 1);
                        i--;
                    } else if (pattern.instruments[i] > removedIndex) {
                        pattern.instruments[i]--;
                    }
                }
                if (pattern.instruments.length <= 0) {
                    pattern.instruments[0] = 0;
                }
            }
        }

        // Determine if any mod instruments now refer to an invalid instrument number. Unset them if so
        for (let channelIndex: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channelIndex < doc.song.getChannelCount(); channelIndex++) {
            for (let instrumentIdx: number = 0; instrumentIdx < doc.song.channels[channelIndex].instruments.length; instrumentIdx++) {
                for (let mod: number = 0; mod < Config.modCount; mod++) {

                    let instrument: Instrument = doc.song.channels[channelIndex].instruments[instrumentIdx];
                    let modInstrument: number = instrument.modInstruments[mod];
                    let modChannel: number = instrument.modChannels[mod];

                    if (modChannel == doc.channel) {
                        // Boundary checking - check if setting was previously higher index
                        if (modInstrument > removedIndex) {
                            instrument.modInstruments[mod]--;
                        }
                        // Boundary checking - check if setting was set to the last instrument before splice
                        else if (modInstrument == removedIndex) {
                            instrument.modInstruments[mod] = 0;
                            instrument.modulators[mod] = 0;
                        }
                    }

                }
            }
        }

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeViewInstrument extends Change {
    constructor(doc: SongDocument, index: number) {
        super();
        if (doc.viewedInstrument[doc.channel] != index) {
            doc.viewedInstrument[doc.channel] = index;
            if ( doc.channel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount )
                doc.recentPatternInstruments[doc.channel] = [index];
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeInstrumentsFlags extends Change {
    constructor(doc: SongDocument, newLayeredInstruments: boolean, newPatternInstruments: boolean) {
        super();
        const oldLayeredInstruments: boolean = doc.song.layeredInstruments;
        const oldPatternInstruments: boolean = doc.song.patternInstruments;
        if (oldLayeredInstruments == newLayeredInstruments && oldPatternInstruments == newPatternInstruments) return;
        doc.song.layeredInstruments = newLayeredInstruments;
        doc.song.patternInstruments = newPatternInstruments;

        for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
            const channel: Channel = doc.song.channels[channelIndex];
            if (channel.instruments.length > doc.song.getMaxInstrumentsPerChannel()) {
                channel.instruments.length = doc.song.getMaxInstrumentsPerChannel();
            }
            for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
                const pattern: Pattern = channel.patterns[j];
                if (!oldPatternInstruments && newPatternInstruments) {
                    // patternInstruments was enabled, set up pattern instruments as appropriate.
                    for (let i: number = 0; i < channel.instruments.length; i++) {
                        pattern.instruments[i] = i;
                    }
                    pattern.instruments.length = channel.instruments.length;
                }
                discardInvalidPatternInstruments(pattern.instruments, doc.song, channelIndex);
            }
        }



        doc.notifier.changed();
        this._didSomething();
    }
}


export class ChangeKey extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        if (doc.song.key != newValue) {
            doc.song.key = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeLoop extends Change {
    constructor(private _doc: SongDocument, public oldStart: number, public oldLength: number, public newStart: number, public newLength: number) {
        super();
        this._doc.song.loopStart = this.newStart;
        this._doc.song.loopLength = this.newLength;
        this._doc.notifier.changed();
        if (this.oldStart != this.newStart || this.oldLength != this.newLength) {
            this._didSomething();
        }
    }
}

export class ChangePitchAdded extends UndoableChange {
    private _doc: SongDocument;
    private _note: Note;
    private _pitch: number;
    private _index: number;
    constructor(doc: SongDocument, note: Note, pitch: number, index: number, deletion: boolean = false) {
        super(deletion);
        this._doc = doc;
        this._note = note;
        this._pitch = pitch;
        this._index = index;
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._note.pitches.splice(this._index, 0, this._pitch);
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._note.pitches.splice(this._index, 1);
        this._doc.notifier.changed();
    }
}

export class ChangeOctave extends Change {
    constructor(doc: SongDocument, public oldValue: number, newValue: number) {
        super();
        doc.song.channels[doc.channel].octave = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeRhythm extends ChangeGroup {
    constructor(doc: SongDocument, newValue: number) {
        super();

        if (doc.song.rhythm != newValue) {
            doc.song.rhythm = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangePaste extends ChangeGroup {
    constructor(doc: SongDocument, pattern: Pattern, notes: any[], selectionStart: number, selectionEnd: number, oldPartDuration: number) {
        super();

        // Erase the current contents of the selection:
        this.append(new ChangeNoteTruncate(doc, pattern, selectionStart, selectionEnd, null, true));

        // Mods don't follow this sequence, so skipping for now.
        let noteInsertionIndex: number = 0;
        if (!doc.song.getChannelIsMod(doc.channel)) {
            for (let i: number = 0; i < pattern.notes.length; i++) {
                if (pattern.notes[i].start < selectionStart) {
                    if (pattern.notes[i].end > selectionStart) throw new Error();

                    noteInsertionIndex = i + 1;
                } else if (pattern.notes[i].start < selectionEnd) {
                    throw new Error();
                }
            }
        }
        else {
            noteInsertionIndex = pattern.notes.length;
        }

        while (selectionStart < selectionEnd) {
            for (const noteObject of notes) {
                const noteStart: number = noteObject["start"] + selectionStart;
                const noteEnd: number = noteObject["end"] + selectionStart;
                if (noteStart >= selectionEnd) break;
                const note: Note = new Note(noteObject["pitches"][0], noteStart, noteEnd, noteObject["pins"][0]["size"], false);
                note.pitches.length = 0;
                for (const pitch of noteObject["pitches"]) {
                    note.pitches.push(pitch);
                }
                note.pins.length = 0;
                for (const pin of noteObject["pins"]) {
                    note.pins.push(makeNotePin(pin.interval, pin.time, pin.size));
                }
                note.continuesLastPattern = (noteObject["continuesLastPattern"] === true) && (note.start == 0);
                pattern.notes.splice(noteInsertionIndex++, 0, note);
                if (note.end > selectionEnd) {
                    this.append(new ChangeNoteLength(doc, note, note.start, selectionEnd));
                }
            }

            selectionStart += oldPartDuration;
        }

        // Need to re-sort the notes by start time as they might change order because of paste.
        if (pattern != null && doc.song.getChannelIsMod(doc.channel)) pattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });


        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangePasteInstrument extends ChangeGroup {
    constructor(doc: SongDocument, instrument: Instrument, instrumentCopy: any) {
        super();
        instrument.fromJsonObject(instrumentCopy, instrumentCopy["isDrum"], instrumentCopy["isMod"], false, false);
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangePasteEnvelope extends ChangeGroup {
    constructor(doc: SongDocument, instrument: Instrument, envelopeSettings: EnvelopeSettings, envelopeCopy: any) {
        super();
        envelopeSettings.fromJsonObject(envelopeCopy, instrument);
        // Check and make sure that the envelope target is supported.
        if (instrument.supportsEnvelopeTarget(envelopeSettings.target, envelopeSettings.index)) {
            // Target and index is supported. Carry on.
        } else {
            // Turn it into none as this target is not supported.
            envelopeSettings.target = Config.instrumentAutomationTargets.dictionary["none"].index;
            envelopeSettings.index = 0;
        }
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangePasteDrumsetEnvelope extends ChangeGroup {
    constructor(doc: SongDocument, drumsetEnvelopeSettings: DrumsetEnvelopeSettings, envelopeCopy: any) {
        super();
        drumsetEnvelopeSettings.fromJsonObject(envelopeCopy);
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeSetPatternInstruments extends Change {
    constructor(doc: SongDocument, channelIndex: number, instruments: number[], pattern: Pattern) {
        super();
        if (!patternsContainSameInstruments(instruments, pattern.instruments)) {
            pattern.instruments.length = 0;
            pattern.instruments.push(...instruments);
            discardInvalidPatternInstruments(pattern.instruments, doc.song, channelIndex);
            this._didSomething();
            doc.notifier.changed();
        }
    }
}

export class ChangeModChannel extends Change {
    constructor(doc: SongDocument, mod: number, index: number, useInstrument?: Instrument) {
        super();
        let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (useInstrument != undefined)
            instrument = useInstrument;

        // None, or swapping from song to instrument/vice-versa
        if (index == 0 || (Config.modulators[instrument.modulators[mod]].forSong && index >= 2) || (!Config.modulators[instrument.modulators[mod]].forSong && index < 2)) {
            instrument.modulators[mod] = Config.modulators.dictionary["none"].index;
        }

        instrument.modChannels[mod] = index - 2;

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeModInstrument extends Change {
    constructor(doc: SongDocument, mod: number, tgtInstrument: number) {
        super();

        let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

        if (instrument.modInstruments[mod] != tgtInstrument) {
            instrument.modInstruments[mod] = tgtInstrument;

            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeModSetting extends Change {
    constructor(doc: SongDocument, mod: number, text: string) {
        super();

        let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

        // Populate all instruments that could be targeted by this mod setting.
        let tgtChannel: number = instrument.modChannels[mod];
        let usedInstruments: Instrument[] = [];
        if (tgtChannel >= 0) { // Ignore song/none.
            if (instrument.modInstruments[mod] == doc.song.channels[tgtChannel].instruments.length) {
                // All - Populate list of all instruments
                usedInstruments = usedInstruments.concat(doc.song.channels[tgtChannel].instruments);
            } else if (instrument.modInstruments[mod] > doc.song.channels[tgtChannel].instruments.length) {
                // Active - Populate list of only used instruments
                let tgtPattern: Pattern | null = doc.song.getPattern(tgtChannel, doc.bar);
                if (tgtPattern != null) {
                    for (let i: number = 0; i < tgtPattern.instruments.length; i++) {
                        usedInstruments.push(doc.song.channels[tgtChannel].instruments[tgtPattern.instruments[i]]);
                    }
                }
            }
            else {
                // Single instrument used.
                usedInstruments.push(doc.song.channels[tgtChannel].instruments[instrument.modInstruments[mod]]);
            }
        }

        // Check if a new effect is being added - if so add the proper associated effect to the instrument(s), and truncate "+ " from start of text.
        if (text.startsWith("+ ")) {
            text = text.substr(2);
            for (let i: number = 0; i < usedInstruments.length; i++) {
                const tgtInstrument: Instrument = usedInstruments[i];
                if (!(tgtInstrument.effects & (1 << Config.modulators.dictionary[text].associatedEffect))) {
                    doc.record(new ChangeToggleEffects(doc, Config.modulators.dictionary[text].associatedEffect, tgtInstrument));
                }
            }
        }

        let setting: number = Config.modulators.dictionary[text].index;

        if (instrument.modulators[mod] != setting) {

            instrument.modulators[mod] = setting;

            // Go through each pattern where this instrument is set, and clean up any notes that are out of bounds
            let cap: number = Config.modulators[setting].maxRawVol;

            for (let i: number = 0; i < doc.song.patternsPerChannel; i++) {
                const pattern: Pattern = doc.song.channels[doc.channel].patterns[i];
                if (pattern.instruments[0] == doc.getCurrentInstrument()) {
                    for (let j: number = 0; j < pattern.notes.length; j++) {
                        const note: Note = pattern.notes[j];
                        if (note.pitches[0] == Config.modCount - mod - 1) {
                            for (let k: number = 0; k < note.pins.length; k++) {
                                const pin: NotePin = note.pins[k];
                                if (pin.size > cap)
                                    pin.size = cap;
                            }
                        }
                    }
                }
            }

            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeModFilter extends Change {
    constructor(doc: SongDocument, mod: number, type: number) {
        super();

        let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

        if (instrument.modFilterTypes[mod] != type) {

            instrument.modFilterTypes[mod] = type;

            // Go through each pattern where this instrument is set, and clean up any notes that are out of bounds
            let cap: number = doc.song.getVolumeCapForSetting(true, instrument.modulators[mod], instrument.modFilterTypes[mod]);

            for (let i: number = 0; i < doc.song.patternsPerChannel; i++) {
                const pattern: Pattern = doc.song.channels[doc.channel].patterns[i];
                if (pattern.instruments[0] == doc.getCurrentInstrument()) {
                    for (let j: number = 0; j < pattern.notes.length; j++) {
                        const note: Note = pattern.notes[j];
                        if (note.pitches[0] == Config.modCount - mod - 1) {
                            for (let k: number = 0; k < note.pins.length; k++) {
                                const pin: NotePin = note.pins[k];
                                if (pin.size > cap)
                                    pin.size = cap;
                            }
                        }
                    }
                }
            }

            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangePatternsPerChannel extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        if (doc.song.patternsPerChannel != newValue) {
            for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
                const channelBars: number[] = doc.song.channels[i].bars;
                const channelPatterns: Pattern[] = doc.song.channels[i].patterns;
                for (let j: number = 0; j < channelBars.length; j++) {
                    if (channelBars[j] > newValue) channelBars[j] = 0;
                }
                for (let j: number = channelPatterns.length; j < newValue; j++) {
                    channelPatterns[j] = new Pattern();
                }
                channelPatterns.length = newValue;
            }
            doc.song.patternsPerChannel = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnsurePatternExists extends UndoableChange {
    private _doc: SongDocument;
    private _bar: number;
    private _channelIndex: number;
    private _patternIndex: number;
    private _patternOldNotes: Note[] | null = null;
    private _oldPatternCount: number;
    private _newPatternCount: number;
    private _oldPatternInstruments: number[] | null = null;
    private _newPatternInstruments: number[];

    constructor(doc: SongDocument, channelIndex: number, bar: number) {
        super(false);
        const song: Song = doc.song;
        if (song.channels[channelIndex].bars[bar] != 0) return;

        this._doc = doc;
        this._bar = bar;
        this._channelIndex = channelIndex;
        this._oldPatternCount = song.patternsPerChannel;
        this._newPatternCount = song.patternsPerChannel;
        if (channelIndex < doc.song.pitchChannelCount + doc.song.noiseChannelCount)
            this._newPatternInstruments = doc.recentPatternInstruments[channelIndex].concat();
        else
            this._newPatternInstruments = [doc.viewedInstrument[channelIndex]];

        let firstEmptyUnusedIndex: number | null = null;
        let firstUnusedIndex: number | null = null;
        for (let patternIndex: number = 1; patternIndex <= song.patternsPerChannel; patternIndex++) {
            let used = false;
            for (let barIndex: number = 0; barIndex < song.barCount; barIndex++) {
                if (song.channels[channelIndex].bars[barIndex] == patternIndex) {
                    used = true;
                    break;
                }
            }
            if (used) continue;
            if (firstUnusedIndex == null) {
                firstUnusedIndex = patternIndex;
            }
            const pattern: Pattern = song.channels[channelIndex].patterns[patternIndex - 1];
            if (pattern.notes.length == 0) {
                firstEmptyUnusedIndex = patternIndex;
                break;
            }
        }

        if (firstEmptyUnusedIndex != null) {
            this._patternIndex = firstEmptyUnusedIndex;
            this._oldPatternInstruments = song.channels[channelIndex].patterns[firstEmptyUnusedIndex - 1].instruments.concat();
        } else if (song.patternsPerChannel < song.barCount) {
            this._newPatternCount = song.patternsPerChannel + 1;
            this._patternIndex = song.patternsPerChannel + 1;
        } else if (firstUnusedIndex != null) {
            this._patternIndex = firstUnusedIndex;
            this._patternOldNotes = song.channels[channelIndex].patterns[firstUnusedIndex - 1].notes;
            this._oldPatternInstruments = song.channels[channelIndex].patterns[firstUnusedIndex - 1].instruments.concat();
        } else {
            throw new Error();
        }

        this._didSomething();
        this._doForwards();
    }

    protected _doForwards(): void {
        const song: Song = this._doc.song;
        for (let j: number = song.patternsPerChannel; j < this._newPatternCount; j++) {
            for (let i: number = 0; i < song.getChannelCount(); i++) {
                song.channels[i].patterns[j] = new Pattern();
            }
        }
        song.patternsPerChannel = this._newPatternCount;
        const pattern: Pattern = song.channels[this._channelIndex].patterns[this._patternIndex - 1];
        pattern.notes = [];
        pattern.instruments.length = 0;
        pattern.instruments.push(...this._newPatternInstruments);
        song.channels[this._channelIndex].bars[this._bar] = this._patternIndex;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        const song: Song = this._doc.song;
        const pattern: Pattern = song.channels[this._channelIndex].patterns[this._patternIndex - 1];
        if (this._patternOldNotes != null) pattern.notes = this._patternOldNotes;
        if (this._oldPatternInstruments != null) {
            pattern.instruments.length = 0;
            pattern.instruments.push(...this._oldPatternInstruments);
        }
        song.channels[this._channelIndex].bars[this._bar] = 0;
        for (let i: number = 0; i < song.getChannelCount(); i++) {
            song.channels[i].patterns.length = this._oldPatternCount;
        }
        song.patternsPerChannel = this._oldPatternCount;
        this._doc.notifier.changed();
    }
}

export class ChangePinTime extends ChangePins {
    constructor(doc: SongDocument | null, note: Note, pinIndex: number, shiftedTime: number, continuesLastPattern: boolean) {
        super(doc, note);

        shiftedTime -= this._oldStart;
        const originalTime: number = this._oldPins[pinIndex].time;
        const skipStart: number = Math.min(originalTime, shiftedTime);
        const skipEnd: number = Math.max(originalTime, shiftedTime);
        let setPin: boolean = false;
        for (let i: number = 0; i < this._oldPins.length; i++) {
            const oldPin: NotePin = note.pins[i];
            const time: number = oldPin.time;
            if (time < skipStart) {
                this._newPins.push(makeNotePin(oldPin.interval, time, oldPin.size));
            } else if (time > skipEnd) {
                if (!setPin) {
                    if (this._newPins.length > 0) continuesLastPattern = note.continuesLastPattern;
                    this._newPins.push(makeNotePin(this._oldPins[pinIndex].interval, shiftedTime, this._oldPins[pinIndex].size));
                    setPin = true;
                }
                this._newPins.push(makeNotePin(oldPin.interval, time, oldPin.size));
            }
        }
        if (!setPin) {
            continuesLastPattern = note.continuesLastPattern;
            this._newPins.push(makeNotePin(this._oldPins[pinIndex].interval, shiftedTime, this._oldPins[pinIndex].size));
        }

        this._finishSetup(continuesLastPattern);
    }
}

export class ChangePitchBend extends ChangePins {
    constructor(doc: SongDocument | null, note: Note, bendStart: number, bendEnd: number, bendTo: number, pitchIndex: number) {
        super(doc, note);

        bendStart -= this._oldStart;
        bendEnd -= this._oldStart;
        bendTo -= note.pitches[pitchIndex];

        let setStart: boolean = false;
        let setEnd: boolean = false;
        let prevInterval: number = 0;
        let prevSize: number = Config.noteSizeMax;
        let persist: boolean = true;
        let i: number;
        let direction: number;
        let stop: number;
        let push: (item: NotePin) => void;
        if (bendEnd > bendStart) {
            i = 0;
            direction = 1;
            stop = note.pins.length;
            push = (item: NotePin) => { this._newPins.push(item); };
        } else {
            i = note.pins.length - 1;
            direction = -1;
            stop = -1;
            push = (item: NotePin) => { this._newPins.unshift(item); };
        }
        for (; i != stop; i += direction) {
            const oldPin: NotePin = note.pins[i];
            const time: number = oldPin.time;
            for (; ;) {
                if (!setStart) {
                    if (time * direction <= bendStart * direction) {
                        prevInterval = oldPin.interval;
                        prevSize = oldPin.size;
                    }
                    if (time * direction < bendStart * direction) {
                        push(makeNotePin(oldPin.interval, time, oldPin.size));
                        break;
                    } else {
                        push(makeNotePin(prevInterval, bendStart, prevSize));
                        setStart = true;
                    }
                } else if (!setEnd) {
                    if (time * direction <= bendEnd * direction) {
                        prevInterval = oldPin.interval;
                        prevSize = oldPin.size;
                    }
                    if (time * direction < bendEnd * direction) {
                        break;
                    } else {
                        push(makeNotePin(bendTo, bendEnd, prevSize));
                        setEnd = true;
                    }
                } else {
                    if (time * direction == bendEnd * direction) {
                        break;
                    } else {
                        if (oldPin.interval != prevInterval) persist = false;
                        push(makeNotePin(persist ? bendTo : oldPin.interval, time, oldPin.size));
                        break;
                    }
                }
            }
        }
        if (!setEnd) {
            push(makeNotePin(bendTo, bendEnd, prevSize));
        }

        this._finishSetup();
    }
}

export class ChangePatternRhythm extends ChangeSequence {
    constructor(doc: SongDocument, pattern: Pattern) {
        super();
        const minDivision: number = Config.partsPerBeat / Config.rhythms[doc.song.rhythm].stepsPerBeat;

        const changeRhythm: (oldTime: number) => number = function (oldTime: number): number {
            let thresholds: number[] | null = Config.rhythms[doc.song.rhythm].roundUpThresholds;
            if (thresholds != null) {
                const beatStart: number = Math.floor(oldTime / Config.partsPerBeat) * Config.partsPerBeat;
                const remainder: number = oldTime - beatStart;
                let newTime: number = beatStart;
                for (const threshold of thresholds) {
                    if (remainder >= threshold) {
                        newTime += minDivision;
                    } else {
                        break;
                    }
                }
                return newTime;
            } else {
                return Math.round(oldTime / minDivision) * minDivision;
            }
        };

        let i: number = 0;
        while (i < pattern.notes.length) {
            const note: Note = pattern.notes[i];
            if (changeRhythm(note.start) >= changeRhythm(note.end)) {
                this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
            } else {
                this.append(new ChangeRhythmNote(doc, note, changeRhythm));
                i++;
            }
        }
    }
}

class ChangeRhythmNote extends ChangePins {
    constructor(doc: SongDocument | null, note: Note, changeRhythm: (oldTime: number) => number) {
        super(doc, note);

        for (const oldPin of this._oldPins) {
            this._newPins.push(makeNotePin(oldPin.interval, changeRhythm(oldPin.time + this._oldStart) - this._oldStart, oldPin.size));
        }

        this._finishSetup();
    }
}

export class ChangeMoveNotesSideways extends ChangeGroup {
    constructor(doc: SongDocument, beatsToMove: number, strategy: string) {
        super();
        let partsToMove: number = Math.round((beatsToMove % doc.song.beatsPerBar) * Config.partsPerBeat);
        if (partsToMove < 0) partsToMove += doc.song.beatsPerBar * Config.partsPerBeat;
        if (partsToMove == 0.0) return;

        switch (strategy) {
            case "wrapAround": {
                const partsPerBar: number = Config.partsPerBeat * doc.song.beatsPerBar;
                for (const channel of doc.song.channels) {
                    for (const pattern of channel.patterns) {
                        const newNotes: Note[] = [];

                        for (let bar: number = 1; bar >= 0; bar--) {
                            const barStartPart: number = bar * partsPerBar;

                            for (const oldNote of pattern.notes) {
                                const absoluteNoteStart: number = oldNote.start + partsToMove;
                                const absoluteNoteEnd: number = oldNote.end + partsToMove;
                                const noteStartPart: number = Math.max(0, absoluteNoteStart - barStartPart);
                                const noteEndPart: number = Math.min(partsPerBar, absoluteNoteEnd - barStartPart);

                                if (noteStartPart < noteEndPart) {
                                    projectNoteIntoBar(oldNote, absoluteNoteStart - barStartPart - noteStartPart, noteStartPart, noteEndPart, newNotes);
                                }
                            }
                        }

                        pattern.notes = newNotes;
                    }
                }
            } break;
            case "overflow": {
                let originalBarCount: number = doc.song.barCount;
                let originalLoopStart: number = doc.song.loopStart;
                let originalLoopLength: number = doc.song.loopLength;

                this.append(new ChangeMoveAndOverflowNotes(doc, doc.song.beatsPerBar, partsToMove));

                if (beatsToMove < 0) {
                    let firstBarIsEmpty: boolean = true;
                    for (const channel of doc.song.channels) {
                        if (channel.bars[0] != 0) firstBarIsEmpty = false;
                    }
                    if (firstBarIsEmpty) {
                        for (const channel of doc.song.channels) {
                            channel.bars.shift();
                        }
                        doc.song.barCount--;
                    } else {
                        originalBarCount++;
                        originalLoopStart++;
                        doc.bar++;
                    }
                }
                while (doc.song.barCount < originalBarCount) {
                    for (const channel of doc.song.channels) {
                        channel.bars.push(0);
                    }
                    doc.song.barCount++;
                }
                doc.song.loopStart = originalLoopStart;
                doc.song.loopLength = originalLoopLength;
            } break;
            default: throw new Error("Unrecognized beats-per-bar conversion strategy.");
        }

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeBeatsPerBar extends ChangeGroup {
    constructor(doc: SongDocument, newValue: number, strategy: string) {
        super();
        if (doc.song.beatsPerBar != newValue) {
            switch (strategy) {
                case "splice": {
                    if (doc.song.beatsPerBar > newValue) {
                        const sequence: ChangeSequence = new ChangeSequence();
                        for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
                            for (let j: number = 0; j < doc.song.channels[i].patterns.length; j++) {
                                sequence.append(new ChangeNoteTruncate(doc, doc.song.channels[i].patterns[j], newValue * Config.partsPerBeat, doc.song.beatsPerBar * Config.partsPerBeat, null, true));
                            }
                        }
                    }
                } break;
                case "stretch": {
                    const changeRhythm = function (oldTime: number): number {
                        return Math.round(oldTime * newValue / doc.song.beatsPerBar);
                    };
                    for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
                        for (let patternIndex: number = 0; patternIndex < doc.song.channels[channelIndex].patterns.length; patternIndex++) {
                            const pattern: Pattern = doc.song.channels[channelIndex].patterns[patternIndex];
                            let noteIndex: number = 0;
                            while (noteIndex < pattern.notes.length) {
                                const note: Note = pattern.notes[noteIndex];
                                if (changeRhythm(note.start) >= changeRhythm(note.end)) {
                                    this.append(new ChangeNoteAdded(doc, pattern, note, noteIndex, true));
                                } else {
                                    this.append(new ChangeRhythmNote(doc, note, changeRhythm));
                                    noteIndex++;
                                }
                            }
                        }
                    }
                    this.append(new ChangeTempo(doc, doc.song.tempo, doc.song.tempo * newValue / doc.song.beatsPerBar));
                } break;
                case "overflow": {
                    this.append(new ChangeMoveAndOverflowNotes(doc, newValue, 0));
                    doc.song.loopStart = 0;
                    doc.song.loopLength = doc.song.barCount;
                } break;
                default: throw new Error("Unrecognized beats-per-bar conversion strategy.");
            }

            doc.song.beatsPerBar = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeScale extends ChangeGroup {
    constructor(doc: SongDocument, newValue: number) {
        super();
        if (doc.song.scale != newValue) {
            doc.song.scale = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeCustomScale extends Change {
    constructor(doc: SongDocument, flags: boolean[]) {
        super();

        for (let i: number = 0; i < Config.pitchesPerOctave; i++) {
            doc.song.scaleCustom[i] = flags[i];
        }

        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeDetectKey extends ChangeGroup {
    constructor(doc: SongDocument) {
        super();
        const song: Song = doc.song;
        const basePitch: number = Config.keys[song.key].basePitch;
        const keyWeights: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount; channelIndex++) {
            for (let barIndex: number = 0; barIndex < song.barCount; barIndex++) {
                const pattern: Pattern | null = song.getPattern(channelIndex, barIndex);
                if (pattern != null) {
                    for (const note of pattern.notes) {
                        const prevPin: NotePin = note.pins[0];
                        for (let pinIndex: number = 1; pinIndex < note.pins.length; pinIndex++) {
                            const nextPin: NotePin = note.pins[pinIndex];
                            if (prevPin.interval == nextPin.interval) {
                                let weight: number = nextPin.time - prevPin.time;
                                weight += Math.max(0, Math.min(Config.partsPerBeat, nextPin.time + note.start) - (prevPin.time + note.start));
                                weight *= nextPin.size + prevPin.size;
                                for (const pitch of note.pitches) {
                                    const key = (basePitch + prevPin.interval + pitch) % 12;
                                    keyWeights[key] += weight;
                                }
                            }
                        }
                    }
                }
            }
        }

        let bestKey: number = 0;
        let bestKeyWeight: number = 0;
        for (let key: number = 0; key < 12; key++) {
            // Look for the root of the most prominent major or minor chord.
            const keyWeight: number = keyWeights[key] * (3 * keyWeights[(key + 7) % 12] + keyWeights[(key + 4) % 12] + keyWeights[(key + 3) % 12]);
            if (bestKeyWeight < keyWeight) {
                bestKeyWeight = keyWeight;
                bestKey = key;
            }
        }

        if (bestKey != song.key) {
            const diff: number = song.key - bestKey;
            const absoluteDiff: number = Math.abs(diff);

            for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount; channelIndex++) {
                for (const pattern of song.channels[channelIndex].patterns) {
                    for (let i: number = 0; i < absoluteDiff; i++) {
                        this.append(new ChangeTranspose(doc, channelIndex, pattern, diff > 0, true));
                    }
                }
            }

            song.key = bestKey;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export function pickRandomPresetValue(isNoise: boolean): number {
    const eligiblePresetValues: number[] = [];
    for (let categoryIndex: number = 0; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
        const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
        for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
            const preset: Preset = category.presets[presetIndex];
            if (preset.settings != undefined && (preset.isNoise == true) == isNoise) {
                eligiblePresetValues.push((categoryIndex << 6) + presetIndex);
            }
        }
    }
    return eligiblePresetValues[(Math.random() * eligiblePresetValues.length) | 0];
}

export function setDefaultInstruments(song: Song): void {
    for (let channelIndex: number = 0; channelIndex < song.channels.length; channelIndex++) {
        for (const instrument of song.channels[channelIndex].instruments) {
            const isNoise: boolean = song.getChannelIsNoise(channelIndex);
            const isMod: boolean = song.getChannelIsMod(channelIndex);
            const presetValue: number = (channelIndex == song.pitchChannelCount) ? EditorConfig.nameToPresetValue(Math.random() > 0.5 ? "chip noise" : "standard drumset")! : pickRandomPresetValue(isNoise);
            const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
            instrument.fromJsonObject(preset.settings, isNoise, isMod, song.rhythm == 0 || song.rhythm == 2, song.rhythm >= 2, 1);
            instrument.effects |= (1 << EffectType.panning);
            instrument.preset = presetValue;
        }
    }
}

export class ChangeSong extends ChangeGroup {
    constructor(doc: SongDocument, newHash: string, jsonFormat: string = "automatic") {
        super();
        let pitchChannelCount = doc.song.pitchChannelCount;
        let noiseChannelCount = doc.song.noiseChannelCount;
        let modChannelCount = doc.song.modChannelCount;
        doc.song.fromBase64String(newHash, jsonFormat);
        if (pitchChannelCount != doc.song.pitchChannelCount || noiseChannelCount != doc.song.noiseChannelCount || modChannelCount != doc.song.modChannelCount) {
            ColorConfig.resetColors();
        }
        if (newHash == "") {
            this.append(new ChangePatternSelection(doc, 0, 0));
            doc.selection.resetBoxSelection();
            setDefaultInstruments(doc.song);
            doc.song.scale = doc.prefs.defaultScale;

            for (let i: number = 0; i <= doc.song.channels.length; i++) {
                doc.viewedInstrument[i] = 0;
                doc.recentPatternInstruments[i] = [0];
            }
            doc.viewedInstrument.length = doc.song.channels.length;
        } else {
            this.append(new ChangeValidateTrackSelection(doc));
        }
        doc.synth.computeLatestModValues();
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeValidateTrackSelection extends Change {
    constructor(doc: SongDocument) {
        super();
        const channelIndex: number = Math.min(doc.channel, doc.song.getChannelCount() - 1);
        const bar: number = Math.max(0, Math.min(doc.song.barCount - 1, doc.bar));
        if (doc.channel != channelIndex || doc.bar != bar) {
			doc.bar = bar;
			doc.channel = channelIndex;
			this._didSomething();
		}
		doc.selection.scrollToSelectedPattern();
		doc.notifier.changed();
    }
}

export class ChangeReplacePatterns extends ChangeGroup {
    constructor(doc: SongDocument, pitchChannels: Channel[], noiseChannels: Channel[], modChannels: Channel[]) {
        super();

        const song: Song = doc.song;

        function removeExtraSparseChannels(channels: Channel[], maxLength: number): void {
            while (channels.length > maxLength) {
                let sparsestIndex: number = channels.length - 1;
                let mostZeroes: number = 0;
                for (let channelIndex: number = 0; channelIndex < channels.length - 1; channelIndex++) {
                    let zeroes: number = 0;
                    for (const bar of channels[channelIndex].bars) {
                        if (bar == 0) zeroes++;
                    }
                    if (zeroes >= mostZeroes) {
                        sparsestIndex = channelIndex;
                        mostZeroes = zeroes;
                    }
                }
                channels.splice(sparsestIndex, 1);
            }
        }

        removeExtraSparseChannels(pitchChannels, Config.pitchChannelCountMax);
        removeExtraSparseChannels(noiseChannels, Config.noiseChannelCountMax);
        removeExtraSparseChannels(modChannels, Config.modChannelCountMax);

        while (pitchChannels.length < Config.pitchChannelCountMin) pitchChannels.push(new Channel());
        while (noiseChannels.length < Config.noiseChannelCountMin) noiseChannels.push(new Channel());
        while (modChannels.length < Config.modChannelCountMin) modChannels.push(new Channel());

        // Set minimum counts.
        song.barCount = 1;
        song.patternsPerChannel = 8;
        const combinedChannels: Channel[] = pitchChannels.concat(noiseChannels.concat(modChannels));
        for (let channelIndex: number = 0; channelIndex < combinedChannels.length; channelIndex++) {
            const channel: Channel = combinedChannels[channelIndex];
            song.barCount = Math.max(song.barCount, channel.bars.length);
            song.patternsPerChannel = Math.max(song.patternsPerChannel, channel.patterns.length);
            song.channels[channelIndex] = channel;
        }
        song.channels.length = combinedChannels.length;
        song.pitchChannelCount = pitchChannels.length;
        song.noiseChannelCount = noiseChannels.length;
        song.modChannelCount = modChannels.length;

        song.barCount = Math.min(Config.barCountMax, song.barCount);
        song.patternsPerChannel = Math.min(Config.barCountMax, song.patternsPerChannel);
        for (let channelIndex: number = 0; channelIndex < song.channels.length; channelIndex++) {
            const channel: Channel = song.channels[channelIndex];

            for (let barIndex: number = 0; barIndex < channel.bars.length; barIndex++) {
                if (channel.bars[barIndex] > song.patternsPerChannel || channel.bars[barIndex] < 0) {
                    channel.bars[barIndex] = 0;
                }
            }
            while (channel.bars.length < song.barCount) {
                channel.bars.push(0);
            }
            channel.bars.length = song.barCount;

            if (channel.instruments.length > song.getMaxInstrumentsPerChannel()) {
                channel.instruments.length = song.getMaxInstrumentsPerChannel();
            }

            for (const pattern of channel.patterns) {
                discardInvalidPatternInstruments(pattern.instruments, song, channelIndex);
            }
            while (channel.patterns.length < song.patternsPerChannel) {
                channel.patterns.push(new Pattern());
            }

            channel.patterns.length = song.patternsPerChannel;
        }

        song.loopStart = Math.max(0, Math.min(song.barCount - 1, song.loopStart));
        song.loopLength = Math.min(song.barCount - song.loopStart, song.loopLength);

        this.append(new ChangeValidateTrackSelection(doc));
        doc.notifier.changed();
        this._didSomething();

        ColorConfig.resetColors();
    }
}

export function comparePatternNotes(a: Note[], b: Note[]): boolean {
    if (a.length != b.length) return false;

    for (let noteIndex: number = 0; noteIndex < a.length; noteIndex++) {
        const oldNote: Note = a[noteIndex];
        const newNote: Note = b[noteIndex];
        if (newNote.start != oldNote.start || newNote.end != oldNote.end || newNote.pitches.length != oldNote.pitches.length || newNote.pins.length != oldNote.pins.length) {
            return false;
        }

        for (let pitchIndex: number = 0; pitchIndex < oldNote.pitches.length; pitchIndex++) {
            if (newNote.pitches[pitchIndex] != oldNote.pitches[pitchIndex]) {
                return false;
            }
        }

        for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
            if (newNote.pins[pinIndex].interval != oldNote.pins[pinIndex].interval || newNote.pins[pinIndex].time != oldNote.pins[pinIndex].time || newNote.pins[pinIndex].size != oldNote.pins[pinIndex].size) {
                return false;
            }
        }
    }

    return true;
}

export function removeDuplicatePatterns(channels: Channel[]): void {
    for (const channel of channels) {
        const newPatterns: Pattern[] = [];
        for (let bar: number = 0; bar < channel.bars.length; bar++) {
            if (channel.bars[bar] == 0) continue;

            const oldPattern: Pattern = channel.patterns[channel.bars[bar] - 1];

            let foundMatchingPattern: boolean = false;
            for (let newPatternIndex: number = 0; newPatternIndex < newPatterns.length; newPatternIndex++) {
                const newPattern: Pattern = newPatterns[newPatternIndex];

                if (!patternsContainSameInstruments(oldPattern.instruments, newPattern.instruments) || newPattern.notes.length != oldPattern.notes.length) {
                    continue;
                }

                if (comparePatternNotes(oldPattern.notes, newPattern.notes)) {
                    foundMatchingPattern = true;
                    channel.bars[bar] = newPatternIndex + 1;
                    break;
                }
            }

            if (!foundMatchingPattern) {
                newPatterns.push(oldPattern);
                channel.bars[bar] = newPatterns.length;
            }
        }

        for (let patternIndex: number = 0; patternIndex < newPatterns.length; patternIndex++) {
            channel.patterns[patternIndex] = newPatterns[patternIndex];
        }
        channel.patterns.length = newPatterns.length;
    }
}

export class ChangeKeyOctave extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        doc.song.octave = Math.max(Config.octaveMin, Math.min(Config.octaveMax, Math.round(newValue)));
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeTempo extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        doc.song.tempo = Math.max(Config.tempoMin, Math.min(Config.tempoMax, Math.round(newValue)));
        doc.synth.unsetMod(Config.modulators.dictionary["tempo"].index);
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeEchoDelay extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.echoDelay = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["echo delay"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeEchoSustain extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.echoSustain = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["echo"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeChorus extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.chorus = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeReverb extends ChangeInstrumentSlider {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super(doc);
        this._instrument.reverb = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["reverb"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeSongReverb extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        doc.song.reverb = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["song reverb"].index);
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeNoteAdded extends UndoableChange {
    private _doc: SongDocument;
    private _pattern: Pattern;
    private _note: Note;
    private _index: number;
    constructor(doc: SongDocument, pattern: Pattern, note: Note, index: number, deletion: boolean = false) {
        super(deletion);
        this._doc = doc;
        this._pattern = pattern;
        this._note = note;
        this._index = index;
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._pattern.notes.splice(this._index, 0, this._note);
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._pattern.notes.splice(this._index, 1);
        this._doc.notifier.changed();
    }
}

export class ChangeNoteLength extends ChangePins {
    constructor(doc: SongDocument | null, note: Note, truncStart: number, truncEnd: number) {
        super(doc, note);
        const continuesLastPattern: boolean = ((this._oldStart < 0 || note.continuesLastPattern) && truncStart == 0);

        truncStart -= this._oldStart;
        truncEnd -= this._oldStart;
        let setStart: boolean = false;
        let prevSize: number = this._oldPins[0].size;
        let prevInterval: number = this._oldPins[0].interval;
        let pushLastPin: boolean = true;
        let i: number;
        for (i = 0; i < this._oldPins.length; i++) {
            const oldPin: NotePin = this._oldPins[i];
            if (oldPin.time < truncStart) {
                prevSize = oldPin.size;
                prevInterval = oldPin.interval;
            } else {
                if (oldPin.time > truncStart && !setStart) {
                    this._newPins.push(makeNotePin(prevInterval, truncStart, prevSize));
                    setStart = true;
                }
                if (oldPin.time <= truncEnd) {
                    this._newPins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.size));
                    if (oldPin.time == truncEnd) {
                        pushLastPin = false;
                        break;
                    }
                } else {
                    break;
                }

            }

        }

        if (pushLastPin) this._newPins.push(makeNotePin(this._oldPins[i].interval, truncEnd, this._oldPins[i].size));

        this._finishSetup(continuesLastPattern);
    }
}

export class ChangeNoteTruncate extends ChangeSequence {
    constructor(doc: SongDocument, pattern: Pattern, start: number, end: number, skipNote: Note | null = null, force: boolean = false) {
        super();
        let i: number = 0;
        while (i < pattern.notes.length) {
            const note: Note = pattern.notes[i];
            if (note == skipNote && skipNote != null) {
                i++;
            } else if (note.end <= start) {
                i++;
            } else if (note.start >= end) {
                // Allow out-of-order notes for mods so that all get checked.
                if (!doc.song.getChannelIsMod(doc.channel)) {
                    break;
                } else {
                    i++;
                }
            } else if (note.start < start && note.end > end) {
                if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0])) {
                    const copy: Note = note.clone();
                    this.append(new ChangeNoteLength(doc, note, note.start, start));
                    i++;
                    this.append(new ChangeNoteAdded(doc, pattern, copy, i, false));
                    this.append(new ChangeNoteLength(doc, copy, end, copy.end));
                }
                i++;
            } else if (note.start < start) {
                if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0]))
                    this.append(new ChangeNoteLength(doc, note, note.start, start));
                i++;
            } else if (note.end > end) {
                if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0]))
                    this.append(new ChangeNoteLength(doc, note, end, note.end));
                i++;
            } else {
                if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0]))
                    this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
                else
                    i++;
            }
        }
    }
}

class ChangeSplitNotesAtSelection extends ChangeSequence {
    constructor(doc: SongDocument, pattern: Pattern) {
        super();
        let i: number = 0;
        while (i < pattern.notes.length) {
            const note: Note = pattern.notes[i];
            if (note.start < doc.selection.patternSelectionStart && doc.selection.patternSelectionStart < note.end) {
                const copy: Note = note.clone();
                this.append(new ChangeNoteLength(doc, note, note.start, doc.selection.patternSelectionStart));
                i++;
                this.append(new ChangeNoteAdded(doc, pattern, copy, i, false));
                this.append(new ChangeNoteLength(doc, copy, doc.selection.patternSelectionStart, copy.end));
                // i++; // The second note might be split again at the end of the selection. Check it again.
            } else if (note.start < doc.selection.patternSelectionEnd && doc.selection.patternSelectionEnd < note.end) {
                const copy: Note = note.clone();
                this.append(new ChangeNoteLength(doc, note, note.start, doc.selection.patternSelectionEnd));
                i++;
                this.append(new ChangeNoteAdded(doc, pattern, copy, i, false));
                this.append(new ChangeNoteLength(doc, copy, doc.selection.patternSelectionEnd, copy.end));
                i++;
            } else {
                i++;
            }
        }
    }
}

class ChangeTransposeNote extends UndoableChange {
    protected _doc: SongDocument;
    protected _note: Note;
    protected _oldStart: number;
    protected _newStart: number;
    protected _oldEnd: number;
    protected _newEnd: number;
    protected _oldPins: NotePin[];
    protected _newPins: NotePin[];
    protected _oldPitches: number[];
    protected _newPitches: number[];
    constructor(doc: SongDocument, channelIndex: number, note: Note, upward: boolean, ignoreScale: boolean = false, octave: boolean = false) {
        super(false);
        this._doc = doc;
        this._note = note;
        this._oldPins = note.pins;
        this._newPins = [];
        this._oldPitches = note.pitches;
        this._newPitches = [];

        // I'm disabling pitch transposing for noise channels to avoid
        // accidentally messing up noise channels when pitch shifting all
        // channels at once.
        const isNoise: boolean = doc.song.getChannelIsNoise(channelIndex);
        if (isNoise != doc.song.getChannelIsNoise(doc.channel)) return;

        // Can't transpose mods
        if (doc.song.getChannelIsMod(doc.channel)) return;

        const maxPitch: number = (isNoise ? Config.drumCount - 1 : Config.maxPitch);

        for (let i: number = 0; i < this._oldPitches.length; i++) {
            let pitch: number = this._oldPitches[i];
            if (octave && !isNoise) {
                if (upward) {
                    pitch = Math.min(maxPitch, pitch + 12);
                } else {
                    pitch = Math.max(0, pitch - 12);
                }
            } else {
                let scale = doc.song.scale == Config.scales.dictionary["Custom Scale"].index ? doc.song.scaleCustom : Config.scales[doc.song.scale].flags;
                if (upward) {
                    for (let j: number = pitch + 1; j <= maxPitch; j++) {
                        if (isNoise || ignoreScale || scale[j % 12]) {
                            pitch = j;
                            break;
                        }
                    }
                } else {
                    for (let j: number = pitch - 1; j >= 0; j--) {
                        if (isNoise || ignoreScale || scale[j % 12]) {
                            pitch = j;
                            break;
                        }
                    }
                }
            }

            let foundMatch: boolean = false;
            for (let j: number = 0; j < this._newPitches.length; j++) {
                if (this._newPitches[j] == pitch) {
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) this._newPitches.push(pitch);
        }

        let min: number = 0;
        let max: number = maxPitch;

        for (let i: number = 1; i < this._newPitches.length; i++) {
            const diff: number = this._newPitches[0] - this._newPitches[i];
            if (min < diff) min = diff;
            if (max > diff + maxPitch) max = diff + maxPitch;
        }

        for (const oldPin of this._oldPins) {
            let interval: number = oldPin.interval + this._oldPitches[0];

            if (interval < min) interval = min;
            if (interval > max) interval = max;
            if (octave && !isNoise) {
                if (upward) {
                    interval = Math.min(max, interval + 12);
                } else {
                    interval = Math.max(min, interval - 12);
                }
            } else {
                let scale = doc.song.scale == Config.scales.dictionary["Custom Scale"].index ? doc.song.scaleCustom : Config.scales[doc.song.scale].flags;
                if (upward) {
                    for (let i: number = interval + 1; i <= max; i++) {
                        if (isNoise || ignoreScale || scale[i % 12]) {
                            interval = i;
                            break;
                        }
                    }
                } else {
                    for (let i: number = interval - 1; i >= min; i--) {
                        if (isNoise || ignoreScale || scale[i % 12]) {
                            interval = i;
                            break;
                        }
                    }
                }
            }
            interval -= this._newPitches[0];
            this._newPins.push(makeNotePin(interval, oldPin.time, oldPin.size));
        }

        if (this._newPins[0].interval != 0) throw new Error("wrong pin start interval");

        for (let i: number = 1; i < this._newPins.length - 1;) {
            if (this._newPins[i - 1].interval == this._newPins[i].interval &&
                this._newPins[i].interval == this._newPins[i + 1].interval &&
                this._newPins[i - 1].size == this._newPins[i].size &&
                this._newPins[i].size == this._newPins[i + 1].size) {
                this._newPins.splice(i, 1);
            } else {
                i++;
            }
        }

        this._doForwards();
        this._didSomething();
    }

    protected _doForwards(): void {
        this._note.pins = this._newPins;
        this._note.pitches = this._newPitches;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._note.pins = this._oldPins;
        this._note.pitches = this._oldPitches;
        this._doc.notifier.changed();
    }
}

export class ChangeTranspose extends ChangeSequence {
    constructor(doc: SongDocument, channelIndex: number, pattern: Pattern, upward: boolean, ignoreScale: boolean = false, octave: boolean = false) {
        super();
        if (doc.selection.patternSelectionActive) {
            this.append(new ChangeSplitNotesAtSelection(doc, pattern));
        }
        for (const note of pattern.notes) {
            if (doc.selection.patternSelectionActive && (note.end <= doc.selection.patternSelectionStart || note.start >= doc.selection.patternSelectionEnd)) {
                continue;
            }
            this.append(new ChangeTransposeNote(doc, channelIndex, note, upward, ignoreScale, octave));
        }
    }
}

export class ChangeTrackSelection extends Change {
    constructor(doc: SongDocument, newX0: number, newX1: number, newY0: number, newY1: number) {
        super();
        doc.selection.boxSelectionX0 = newX0;
        doc.selection.boxSelectionX1 = newX1;
        doc.selection.boxSelectionY0 = newY0;
        doc.selection.boxSelectionY1 = newY1;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangePatternSelection extends UndoableChange {
    private _doc: SongDocument;
    private _oldStart: number;
    private _oldEnd: number;
    private _oldActive: boolean;
    private _newStart: number;
    private _newEnd: number;
    private _newActive: boolean;

    constructor(doc: SongDocument, newStart: number, newEnd: number) {
        super(false);
        this._doc = doc;
        this._oldStart = doc.selection.patternSelectionStart;
        this._oldEnd = doc.selection.patternSelectionEnd;
        this._oldActive = doc.selection.patternSelectionActive;
        this._newStart = newStart;
        this._newEnd = newEnd;
        this._newActive = newStart < newEnd;
        this._doForwards();
        this._didSomething();
    }

    protected _doForwards(): void {
        this._doc.selection.patternSelectionStart = this._newStart;
        this._doc.selection.patternSelectionEnd = this._newEnd;
        this._doc.selection.patternSelectionActive = this._newActive;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._doc.selection.patternSelectionStart = this._oldStart;
        this._doc.selection.patternSelectionEnd = this._oldEnd;
        this._doc.selection.patternSelectionActive = this._oldActive;
        this._doc.notifier.changed();
    }
}

export class ChangeDragSelectedNotes extends ChangeSequence {
    constructor(doc: SongDocument, channelIndex: number, pattern: Pattern, parts: number, transpose: number) {
        super();

        if (parts == 0 && transpose == 0) return;

        if (doc.selection.patternSelectionActive) {
            this.append(new ChangeSplitNotesAtSelection(doc, pattern));
        }

        const oldStart: number = doc.selection.patternSelectionStart;
        const oldEnd: number = doc.selection.patternSelectionEnd;
        const newStart: number = Math.max(0, Math.min(doc.song.beatsPerBar * Config.partsPerBeat, oldStart + parts));
        const newEnd: number = Math.max(0, Math.min(doc.song.beatsPerBar * Config.partsPerBeat, oldEnd + parts));
        if (newStart == newEnd) {
            // Just erase the current contents of the selection:
            this.append(new ChangeNoteTruncate(doc, pattern, oldStart, oldEnd, null, true));
        } else if (parts < 0) {
            // Clear space for the dragged notes:
            this.append(new ChangeNoteTruncate(doc, pattern, newStart, Math.min(oldStart, newEnd), null, true));
        } else {
            // Clear space for the dragged notes:
            this.append(new ChangeNoteTruncate(doc, pattern, Math.max(oldEnd, newStart), newEnd, null, true));
        }

        this.append(new ChangePatternSelection(doc, newStart, newEnd));
        const draggedNotes = [];
        let noteInsertionIndex: number = 0;
        let i: number = 0;
        while (i < pattern.notes.length) {
            const note: Note = pattern.notes[i];
            if (note.end <= oldStart || note.start >= oldEnd) {
                i++;
                if (note.end <= newStart) noteInsertionIndex = i;
            } else {
                draggedNotes.push(note.clone());
                this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
            }
        }

        for (const note of draggedNotes) {
            note.start += parts;
            note.end += parts;
            if (note.end <= newStart) continue;
            if (note.start >= newEnd) continue;

            this.append(new ChangeNoteAdded(doc, pattern, note, noteInsertionIndex++, false));

            this.append(new ChangeNoteLength(doc, note, Math.max(note.start, newStart), Math.min(newEnd, note.end)));

            for (let i: number = 0; i < Math.abs(transpose); i++) {
                this.append(new ChangeTransposeNote(doc, channelIndex, note, transpose > 0, doc.prefs.notesOutsideScale));
            }

        }
    }
}

export class ChangeHoldingModRecording extends Change {
    public storedChange: Change | null;
    public storedValues: number[] | null;
    public storedSlider: Slider | null;
    constructor(doc: SongDocument, storedChange: Change | null, storedValues: number[] | null, slider: Slider | null) {
        super();
        this.storedChange = storedChange;
        this.storedValues = storedValues;
        this.storedSlider = slider;
        this._didSomething();
    }
}

export class ChangeDuplicateSelectedReusedPatterns extends ChangeGroup {
    constructor(doc: SongDocument, barStart: number, barWidth: number, channelStart: number, channelHeight: number) {
        super();
        for (let channelIndex: number = channelStart; channelIndex < channelStart + channelHeight; channelIndex++) {
            const reusablePatterns: Dictionary<number> = {};

            for (let bar: number = barStart; bar < barStart + barWidth; bar++) {
                const currentPatternIndex: number = doc.song.channels[channelIndex].bars[bar];
                if (currentPatternIndex == 0) continue;

                if (reusablePatterns[String(currentPatternIndex)] == undefined) {
                    let isUsedElsewhere = false;
                    for (let bar2: number = 0; bar2 < doc.song.barCount; bar2++) {
                        if (bar2 < barStart || bar2 >= barStart + barWidth) {
                            if (doc.song.channels[channelIndex].bars[bar2] == currentPatternIndex) {
                                isUsedElsewhere = true;
                                break;
                            }
                        }
                    }
                    if (isUsedElsewhere) {
                        // Need to duplicate the pattern.
                        const copiedPattern: Pattern = doc.song.getPattern(channelIndex, bar)!;
                        this.append(new ChangePatternNumbers(doc, 0, bar, channelIndex, 1, 1));
                        this.append(new ChangeEnsurePatternExists(doc, channelIndex, bar));
                        const newPattern: Pattern | null = doc.song.getPattern(channelIndex, bar);
                        if (newPattern == null) throw new Error();
                        this.append(new ChangePaste(doc, newPattern, copiedPattern.notes, 0, Config.partsPerBeat * doc.song.beatsPerBar, Config.partsPerBeat * doc.song.beatsPerBar));

                        // Copy the instruments into the new pattern.
                        newPattern.instruments.length = 0;
                        newPattern.instruments.push(...copiedPattern.instruments);

                        reusablePatterns[String(currentPatternIndex)] = doc.song.channels[channelIndex].bars[bar];
                    } else {
                        reusablePatterns[String(currentPatternIndex)] = currentPatternIndex;
                    }
                }

                this.append(new ChangePatternNumbers(doc, reusablePatterns[String(currentPatternIndex)], bar, channelIndex, 1, 1));
            }
        }
    }
}

export class ChangePatternScale extends Change {
    constructor(doc: SongDocument, pattern: Pattern, scaleMap: number[]) {
        super();
        if (doc.selection.patternSelectionActive) {
            new ChangeSplitNotesAtSelection(doc, pattern);
        }
        const maxPitch: number = Config.maxPitch;
        for (const note of pattern.notes) {
            if (doc.selection.patternSelectionActive && (note.end <= doc.selection.patternSelectionStart || note.start >= doc.selection.patternSelectionEnd)) {
                continue;
            }

            const newPitches: number[] = [];
            const newPins: NotePin[] = [];
            for (let i: number = 0; i < note.pitches.length; i++) {
                const pitch: number = note.pitches[i];
                const transformedPitch: number = scaleMap[pitch % 12] + (pitch - (pitch % 12));
                if (newPitches.indexOf(transformedPitch) == -1) {
                    newPitches.push(transformedPitch);
                }
            }

            let min: number = 0;
            let max: number = maxPitch;

            for (let i: number = 1; i < newPitches.length; i++) {
                const diff: number = newPitches[0] - newPitches[i];
                if (min < diff) min = diff;
                if (max > diff + maxPitch) max = diff + maxPitch;
            }

            for (const oldPin of note.pins) {
                let interval: number = oldPin.interval + note.pitches[0];
                if (interval < min) interval = min;
                if (interval > max) interval = max;
                const transformedInterval: number = scaleMap[interval % 12] + (interval - (interval % 12));
                newPins.push(makeNotePin(transformedInterval - newPitches[0], oldPin.time, oldPin.size));
            }

            if (newPins[0].interval != 0) throw new Error("wrong pin start interval");

            for (let i: number = 1; i < newPins.length - 1;) {
                if (newPins[i - 1].interval == newPins[i].interval &&
                    newPins[i].interval == newPins[i + 1].interval &&
                    newPins[i - 1].size == newPins[i].size &&
                    newPins[i].size == newPins[i + 1].size) {
                    newPins.splice(i, 1);
                } else {
                    i++;
                }
            }

            note.pitches = newPitches;
            note.pins = newPins;
        }
        this._didSomething();
        doc.notifier.changed();
    }
}

export class ChangeVolume extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].volume = newValue;
        // Not used currently as mod is implemented as multiplicative.
        //doc.synth.unsetMod(ModSetting.mstInsVolume, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeSongTitle extends Change {
    constructor(doc: SongDocument, oldValue: string, newValue: string) {
        super();
        if (newValue.length > Config.songTitleCharLimit) {
            newValue = newValue.substring(0, Config.songTitleCharLimit);
        }

        doc.song.title = newValue;
        document.title = newValue + " - " + EditorConfig.versionDisplayName;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeSongSubtitle extends Change {
    constructor(doc: SongDocument, oldValue: string, newValue: string) {
        super();
        if (newValue.length > Config.songSubtitleCharLimit) {
            newValue = newValue.substring(0, Config.songSubtitleCharLimit);
        }

        doc.song.subtitle = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeChannelName extends Change {
    constructor(doc: SongDocument, oldValue: string, newValue: string, muteEditor?: boolean) {
        super();
        if (newValue.length > Config.channelNameCharLimit) {
            newValue = newValue.substring(0, Config.channelNameCharLimit);
        }

        if (!muteEditor) doc.song.channels[doc.channel].name = newValue;
        else doc.song.channels[doc.muteEditorChannel].name = newValue;
        doc.recalcChannelNames = true;

        doc.notifier.changed();
        if (oldValue != newValue || newValue == "") this._didSomething();
    }
}

export class ChangePan extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].pan = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["pan"].index, doc.channel, doc.getCurrentInstrument());
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangePanDelay extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].panDelay = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) this._didSomething();
    }
}

export class ChangeSizeBend extends UndoableChange {
    private _doc: SongDocument;
    private _note: Note;
    private _oldPins: NotePin[];
    private _newPins: NotePin[];
    constructor(doc: SongDocument, note: Note, bendPart: number, bendSize: number, bendInterval: number, uniformSize: boolean) {
        super(false);
        this._doc = doc;
        this._note = note;
        this._oldPins = note.pins;
        this._newPins = [];

        let inserted: boolean = false;

        for (const pin of note.pins) {
            if (pin.time < bendPart) {
                if (uniformSize) {
                    this._newPins.push(makeNotePin(pin.interval, pin.time, bendSize));
                } else {
                    this._newPins.push(pin);
                }
            } else if (pin.time == bendPart) {
                this._newPins.push(makeNotePin(bendInterval, bendPart, bendSize));
                inserted = true;
            } else {
                if (!uniformSize && !inserted) {
                    this._newPins.push(makeNotePin(bendInterval, bendPart, bendSize));
                    inserted = true;
                }
                if (uniformSize) {
                    this._newPins.push(makeNotePin(pin.interval, pin.time, bendSize));
                } else {
                    this._newPins.push(pin);
                }
            }
        }

        removeRedundantPins(this._newPins);

        this._doForwards();
        this._didSomething();
    }

    protected _doForwards(): void {
        this._note.pins = this._newPins;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._note.pins = this._oldPins;
        this._doc.notifier.changed();
    }
}

export class ChangeChipWave extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWave != newValue) {
            instrument.chipWave = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeNoiseWave extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipNoise != newValue) {
            instrument.chipNoise = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

/*export class ChangeNoiseSeedRandomization extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.noiseSeedRandomization;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.noiseSeedRandomization = newValue;
            this._didSomething();
        }
    }
}

export class ChangeNoiseSeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (oldValue != newValue) {
            instrument.noiseSeed = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}*/

export class ChangeAddEnvelope extends Change {
    constructor(doc: SongDocument, addingCopiedEnvelope?: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.addEnvelope(0, 0, 0);
        if (addingCopiedEnvelope == true) {
            const storedEnvelope: any = JSON.parse(String(window.localStorage.getItem("envelopeCopy")));
            const envelopeSettings = instrument.envelopes[instrument.envelopeCount - 1];
            envelopeSettings.fromJsonObject(storedEnvelope, instrument);
            // Check and make sure that the envelope target is supported.
            if (instrument.supportsEnvelopeTarget(envelopeSettings.target, envelopeSettings.index)) {
                // Target and index is supported. Carry on.
            } else {
                // Turn it into none as this target is not supported.
                envelopeSettings.target = Config.instrumentAutomationTargets.dictionary["none"].index;
                envelopeSettings.index = 0;
            }
        }
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class RandomEnvelope extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, instrument: Instrument) {
        super();
        const instEnv = instrument.envelopes[envelopeIndex];
        const randomSpeed: number[] = [0.125, 0.2, 0.25, 0.333, 0.4, 0.5, 0.5, 0.667, 0.75, 1, 1, 1, 1, 1.333, 1.5, 1.75, 2, 2, 3, 4, 4, 6, 8, 10, 12, 14, 16];
        const randomLowerBounds: number[] = [0, 0, 0, 0, 0, 0, 0, 0.5, 1,   1, 0.5, 2];
        const randomUpperBounds: number[] = [1, 1, 1, 1, 1, 1, 0.5, 0, 0, 0.5,   1, 0];
        const randomStepAmounts: number[] = [2, 2, 3, 4, 4, 4, 6, 8, 12, 16];
        const randomMirrorAmounts: number[] = [2, 3, 3, 4, 5, 5, 5, 5, 7, 9, 12, 16, 20];
        const randomLFORadioButtons: number[] = [0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 3];
        const randomAcceleration: number[] = [0.33, 0.5, 0.75, 0.8, 0.9, 0.9, 1.1, 1.1, 1.25, 1.5, 2];
        let sameRandomNumber: number = Math.floor(Math.random() * randomLowerBounds.length);
        // Push target indices into an array. Note volume is by default always a target so start with that.
        const availableTargets: number[] = [Config.instrumentAutomationTargets.dictionary["noteVolume"].index];
        if (instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.supersaw) availableTargets.push(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index);
        if (instrument.type == InstrumentType.pickedString) availableTargets.push(Config.instrumentAutomationTargets.dictionary["stringSustain"].index);
        if (instrument.type != InstrumentType.drumset && instrument.type != InstrumentType.fm && instrument.type != InstrumentType.advfm && instrument.type != InstrumentType.supersaw) availableTargets.push(Config.instrumentAutomationTargets.dictionary["unison"].index);
        let pwmPossible: boolean = false;
        if (instrument.type == InstrumentType.fm || instrument.type == InstrumentType.advfm) {
            availableTargets.push(Config.instrumentAutomationTargets.dictionary["operatorFrequency"].index, Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index);
            for (let i = 0; i < Config.operatorCount+2; i++) {
                if (instrument.operators[i].waveform == Config.operatorWaves.dictionary["pulse width"].index) pwmPossible = true;
            }
            if (pwmPossible) availableTargets.push(Config.instrumentAutomationTargets.dictionary["operatorPulseWidth"].index);
        }
        if (instrument.type == InstrumentType.supersaw) availableTargets.push(Config.instrumentAutomationTargets.dictionary["supersawDynamism"].index, Config.instrumentAutomationTargets.dictionary["supersawSpread"].index, Config.instrumentAutomationTargets.dictionary["supersawShape"].index);
        if (effectsIncludePitchShift(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["pitchShift"].index);
        if (effectsIncludeDetune(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["detune"].index);
        if (effectsIncludeVibrato(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["vibratoDepth"].index);
        if (effectsIncludeNoteFilter(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, Config.instrumentAutomationTargets.dictionary["noteFilterFreq"].index);
        if (effectsIncludeWavefold(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["wavefoldBounds"].index);
        if (effectsIncludeDistortion(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["distortion"].index);
        if (effectsIncludeClipper(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["clipBounds"].index);
        if (effectsIncludeBitcrusher(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["bitCrusher"].index, Config.instrumentAutomationTargets.dictionary["freqCrusher"].index);
        if (effectsIncludeChorus(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["chorus"].index);
        if (effectsIncludeReverb(instrument.effects)) availableTargets.push(Config.instrumentAutomationTargets.dictionary["reverb"].index);
        // Variable to dynamically change the random number depending on the rolled envelope.
        let randomIndex: number[] = [];
        // Declare this random number early so it can be used for randomIndex.
        let randomTarget: number = availableTargets[Math.floor(Math.random() * availableTargets.length)];
        if (randomTarget == Config.instrumentAutomationTargets.dictionary["operatorFrequency"].index || randomTarget == Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index) {
            if (instrument.type == InstrumentType.fm) randomIndex = [0, 1, 2, 3];
            else if (instrument.type == InstrumentType.advfm) randomIndex = [0, 1, 2, 3, 4, 5];
        } else if (randomTarget == Config.instrumentAutomationTargets.dictionary["operatorPulseWidth"].index) {
            for (let i = 0; i < Config.operatorCount+2; i++) {
                if (instrument.operators[i].waveform == Config.operatorWaves.dictionary["pulse width"].index) randomIndex.push(i);
            }
        } else if (randomTarget == Config.instrumentAutomationTargets.dictionary["noteFilterFreq"].index) {
            for (let i = 0; i < instrument.noteFilter.controlPointCount; i++) {
                randomIndex.push(i);
            }
        }
        // Set early for making sure special-case settings aren't stored in envelopes that can't use them.
        let randomEnvelope: number = Math.floor(Math.random() * (Config.envelopes.length - 1) + 1);
        // Reroll if custom.
        while (randomEnvelope == Config.envelopes.dictionary["custom"].index) randomEnvelope = Math.floor(Math.random() * (Config.envelopes.length - 1) + 1);
        instEnv.target = randomTarget;
        if (
            randomTarget == Config.instrumentAutomationTargets.dictionary["operatorFrequency"].index || 
            randomTarget == Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index || 
            randomTarget == Config.instrumentAutomationTargets.dictionary["noteFilterFreq"].index || 
            randomTarget == Config.instrumentAutomationTargets.dictionary["operatorPulseWidth"].index
        ) {
            instEnv.index = randomIndex[Math.floor(Math.random() * randomIndex.length)];
        } else { 
            instEnv.index = 0;
        }
        instEnv.envelope = randomEnvelope;
        instEnv.envelopeSpeed = randomSpeed[Math.floor(Math.random() * randomSpeed.length)];
        instEnv.lowerBound = randomLowerBounds[sameRandomNumber];
        instEnv.upperBound = randomUpperBounds[sameRandomNumber];
        if (randomEnvelope == Config.envelopes.dictionary["pitch"].index) {
            instEnv.pitchStart = Math.floor(Math.random() * (instrument.isNoiseInstrument ? Config.drumCount : Config.maxPitch));
            instEnv.pitchEnd = Math.floor(Math.random() * (instrument.isNoiseInstrument ? Config.drumCount : Config.maxPitch));
            instEnv.pitchAmplify = Math.round(Math.random() * 4) == 4 ? true : false;
            if (!instEnv.pitchAmplify) instEnv.pitchBounce = Math.round(Math.random() * 3) == 3 ? true : false;
        } else {
            instEnv.pitchStart = instrument.isNoiseInstrument ? 1 : 0;
            instEnv.pitchEnd = instrument.isNoiseInstrument ? Config.drumCount : Config.maxPitch;
            instEnv.pitchAmplify = false;
            instEnv.pitchBounce = false;
        }
        if (randomEnvelope == Config.envelopes.dictionary["dogebox2 clap"].index) {
            instEnv.mirrorAmount = randomMirrorAmounts[Math.floor(Math.random() * randomMirrorAmounts.length)];
        } else {
            instEnv.mirrorAmount = 5;
        }
        if (randomEnvelope == Config.envelopes.dictionary["LFO"].index) {
            instEnv.LFOSettings.LFOShape = Math.floor(Math.random() * LFOShapes.length);
            if (instEnv.LFOSettings.LFOShape == LFOShapes.Pulses) {
                instEnv.LFOSettings.LFOPulseWidth = Math.floor(Math.random() * 20);
            } else {
                instEnv.LFOSettings.LFOPulseWidth = Config.LFOPulseWidthDefault;
            }
            if (instEnv.LFOSettings.LFOShape == LFOShapes.Trapezoid) {
                instEnv.LFOSettings.LFOTrapezoidRatio = Math.floor(Math.random() * Config.LFOTrapezoidRatioMax - Config.LFOTrapezoidRatioMin) + Config.LFOTrapezoidRatioMin;
            } else {
                instEnv.LFOSettings.LFOTrapezoidRatio = 1;
            }
            if (instEnv.LFOSettings.LFOShape == LFOShapes.Stairs) {
                instEnv.LFOSettings.LFOStepAmount = randomStepAmounts[Math.floor(Math.random() * randomStepAmounts.length)];
            } else {
                instEnv.LFOSettings.LFOStepAmount = 4;
            }
            let randomLFOCheckbox = randomLFORadioButtons[Math.floor(Math.random() * randomLFORadioButtons.length)];
            instEnv.LFOSettings.LFOActiveCheckbox = randomLFOCheckbox;
            if (randomLFOCheckbox == 1) instEnv.LFOSettings.LFOAcceleration = randomAcceleration[Math.floor(Math.random() * randomAcceleration.length)];
            else instEnv.LFOSettings.LFOAcceleration = 1;
        }
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeRemoveEnvelope extends Change {
    constructor(doc: SongDocument, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopeCount--;
        for (let i: number = index; i < instrument.envelopeCount; i++) {
            const instEnv = instrument.envelopes[i];
            const nextEnv = instrument.envelopes[i + 1];
            instEnv.target = nextEnv.target;
            instEnv.index = nextEnv.index;
            instEnv.envelope = nextEnv.envelope;
            instEnv.envelopeSpeed = nextEnv.envelopeSpeed;
            instEnv.discrete = nextEnv.discrete;
            instEnv.lowerBound = nextEnv.lowerBound;
            instEnv.upperBound = nextEnv.upperBound;
            instEnv.delay = nextEnv.delay;
            instEnv.pitchStart = nextEnv.pitchStart;
            instEnv.pitchEnd = nextEnv.pitchEnd;
            instEnv.pitchAmplify = nextEnv.pitchAmplify;
            instEnv.pitchBounce = nextEnv.pitchBounce;
            instEnv.phase = nextEnv.phase;
            instEnv.measurementType = nextEnv.measurementType;
            instEnv.mirrorAmount = nextEnv.mirrorAmount;
            instEnv.LFOSettings.LFOShape = nextEnv.LFOSettings.LFOShape;
            instEnv.LFOSettings.LFOActiveCheckbox = nextEnv.LFOSettings.LFOActiveCheckbox;
            instEnv.LFOSettings.LFOAcceleration = nextEnv.LFOSettings.LFOAcceleration;
            instEnv.LFOSettings.LFOPulseWidth = nextEnv.LFOSettings.LFOPulseWidth;
            instEnv.LFOSettings.LFOTrapezoidRatio = nextEnv.LFOSettings.LFOTrapezoidRatio;
            instEnv.LFOSettings.LFOStepAmount = nextEnv.LFOSettings.LFOStepAmount;
            instEnv.customEnvGridWidth = nextEnv.customEnvGridWidth;
            instEnv.customEnvGridHeight = nextEnv.customEnvGridHeight;
            instEnv.customEnvGridPoints = nextEnv.customEnvGridPoints;
            instEnv.alternateRange = nextEnv.alternateRange;
        }
        // TODO: Shift any envelopes that were targeting other envelope indices after the removed one.
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeSetEnvelopeTarget extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, target: number, targetIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldTarget: number = instrument.envelopes[envelopeIndex].target;
        const oldIndex: number = instrument.envelopes[envelopeIndex].index;
        if (oldTarget != target || oldIndex != targetIndex) {
            instrument.envelopes[envelopeIndex].target = target;
            instrument.envelopes[envelopeIndex].index = targetIndex;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeSetEnvelopeType extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.envelopes[envelopeIndex].envelope;
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].envelope = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeOrder extends Change {
    constructor(doc: SongDocument, index: number, moveWhere: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const instEnv = instrument.envelopes[index];
        // moveWhere:  True = Up, False = Down
        let idxUp = mod(index - 1, instrument.envelopeCount);
        let idxDown = mod(index + 1, instrument.envelopeCount);
        const envAbove = instrument.envelopes[idxUp];
        const envBelow = instrument.envelopes[idxDown];

        let env1Target = instEnv.target;
        let env1Index = instEnv.index;
        let env1Envelope = instEnv.envelope;
        let env1Speed = instEnv.envelopeSpeed;
        let env1Discrete = instEnv.discrete;
        let env1LowerBound = instEnv.lowerBound;
        let env1UpperBound = instEnv.upperBound;
        let env1Delay = instEnv.delay;
        let env1PitchStart = instEnv.pitchStart;
        let env1PitchEnd = instEnv.pitchEnd;
        let env1PitchAmplify = instEnv.pitchAmplify;
        let env1PitchBounce = instEnv.pitchBounce;
        let env1Phase = instEnv.phase;
        let env1MeasurementType = instEnv.measurementType;
        let env1MirrorAmount = instEnv.mirrorAmount;
        let env1LFOShape = instEnv.LFOSettings.LFOShape;
        let env1LFOActiveCheckbox = instEnv.LFOSettings.LFOActiveCheckbox;
        let env1LFOAcceleration = instEnv.LFOSettings.LFOAcceleration;
        let env1LFOPulseWidth = instEnv.LFOSettings.LFOPulseWidth;
        let env1LFOTrapezoidRatio = instEnv.LFOSettings.LFOTrapezoidRatio;
        let env1LFOStepAmount = instEnv.LFOSettings.LFOStepAmount;
        let env1CustomEnvGridWidth = instEnv.customEnvGridWidth;
        let env1CustomEnvGridHeight = instEnv.customEnvGridHeight;
        let env1CustomEnvGridPoints = instEnv.customEnvGridPoints;
        let env1AlternateRange = instEnv.alternateRange;

        let env2Target, env2Index, env2Envelope, env2Speed, env2Discrete, env2LowerBound, env2UpperBound, env2Delay, env2PitchStart, env2PitchEnd, env2PitchAmplify, env2PitchBounce, env2Phase, env2MeasurementType, env2MirrorAmount, env2LFOShape, env2LFOActiveCheckbox, env2LFOAcceleration, env2LFOPulseWidth, env2LFOTrapezoidRatio, env2LFOStepAmount, env2CustomEnvGridWidth, env2CustomEnvGridHeight, env2CustomEnvGridPoints, env2AlternateRange;
        if (moveWhere) {
            env2Target = envAbove.target;
            env2Index = envAbove.index;
            env2Envelope = envAbove.envelope;
            env2Speed = envAbove.envelopeSpeed;
            env2Discrete = envAbove.discrete;
            env2LowerBound = envAbove.lowerBound;
            env2UpperBound = envAbove.upperBound;
            env2Delay = envAbove.delay;
            env2PitchStart = envAbove.pitchStart;
            env2PitchEnd = envAbove.pitchEnd;
            env2PitchAmplify = envAbove.pitchAmplify;
            env2PitchBounce = envAbove.pitchBounce;
            env2Phase = envAbove.phase;
            env2MeasurementType = envAbove.measurementType;
            env2MirrorAmount = envAbove.mirrorAmount;
            env2LFOShape = envAbove.LFOSettings.LFOShape;
            env2LFOActiveCheckbox = envAbove.LFOSettings.LFOActiveCheckbox;
            env2LFOAcceleration = envAbove.LFOSettings.LFOAcceleration;
            env2LFOPulseWidth = envAbove.LFOSettings.LFOPulseWidth;
            env2LFOTrapezoidRatio = envAbove.LFOSettings.LFOTrapezoidRatio;
            env2LFOStepAmount = envAbove.LFOSettings.LFOStepAmount;
            env2CustomEnvGridWidth = envAbove.customEnvGridWidth;
            env2CustomEnvGridHeight = envAbove.customEnvGridHeight;
            env2CustomEnvGridPoints = envAbove.customEnvGridPoints;
            env2AlternateRange = envAbove.alternateRange;

            envAbove.target = env1Target;
            envAbove.index = env1Index;
            envAbove.envelope = env1Envelope;
            envAbove.envelopeSpeed = env1Speed;
            envAbove.discrete = env1Discrete;
            envAbove.lowerBound = env1LowerBound;
            envAbove.upperBound = env1UpperBound;
            envAbove.delay = env1Delay;
            envAbove.pitchStart = env1PitchStart;
            envAbove.pitchEnd = env1PitchEnd;
            envAbove.pitchAmplify = env1PitchAmplify;
            envAbove.pitchBounce = env1PitchBounce;
            envAbove.phase = env1Phase;
            envAbove.measurementType = env1MeasurementType;
            envAbove.mirrorAmount = env1MirrorAmount;
            envAbove.LFOSettings.LFOShape = env1LFOShape;
            envAbove.LFOSettings.LFOActiveCheckbox = env1LFOActiveCheckbox;
            envAbove.LFOSettings.LFOAcceleration = env1LFOAcceleration;
            envAbove.LFOSettings.LFOPulseWidth = env1LFOPulseWidth;
            envAbove.LFOSettings.LFOTrapezoidRatio = env1LFOTrapezoidRatio;
            envAbove.LFOSettings.LFOStepAmount = env1LFOStepAmount;
            envAbove.customEnvGridWidth = env1CustomEnvGridWidth;
            envAbove.customEnvGridHeight = env1CustomEnvGridHeight;
            envAbove.customEnvGridPoints = env1CustomEnvGridPoints;
            envAbove.alternateRange = env1AlternateRange;
        } else {
            env2Target = envBelow.target;
            env2Index = envBelow.index;
            env2Envelope = envBelow.envelope;
            env2Speed = envBelow.envelopeSpeed;
            env2Discrete = envBelow.discrete;
            env2LowerBound = envBelow.lowerBound;
            env2UpperBound = envBelow.upperBound;
            env2Delay = envBelow.delay;
            env2PitchStart = envBelow.pitchStart;
            env2PitchEnd = envBelow.pitchEnd;
            env2PitchAmplify = envBelow.pitchAmplify;
            env2PitchBounce = envBelow.pitchBounce;
            env2Phase = envBelow.phase;
            env2MeasurementType = envBelow.measurementType;
            env2MirrorAmount = envBelow.mirrorAmount;
            env2LFOShape = envBelow.LFOSettings.LFOShape;
            env2LFOActiveCheckbox = envBelow.LFOSettings.LFOActiveCheckbox;
            env2LFOAcceleration = envBelow.LFOSettings.LFOAcceleration;
            env2LFOPulseWidth = envBelow.LFOSettings.LFOPulseWidth;
            env2LFOTrapezoidRatio = envBelow.LFOSettings.LFOTrapezoidRatio;
            env2LFOStepAmount = envBelow.LFOSettings.LFOStepAmount;
            env2CustomEnvGridWidth = envBelow.customEnvGridWidth;
            env2CustomEnvGridHeight = envBelow.customEnvGridHeight;
            env2CustomEnvGridPoints = envBelow.customEnvGridPoints;
            env2AlternateRange = envBelow.alternateRange;

            envBelow.target = env1Target;
            envBelow.index = env1Index;
            envBelow.envelope = env1Envelope;
            envBelow.envelopeSpeed = env1Speed;
            envBelow.discrete = env1Discrete;
            envBelow.lowerBound = env1LowerBound;
            envBelow.upperBound = env1UpperBound;
            envBelow.delay = env1Delay;
            envBelow.pitchStart = env1PitchStart;
            envBelow.pitchEnd = env1PitchEnd;
            envBelow.pitchAmplify = env1PitchAmplify;
            envBelow.pitchBounce = env1PitchBounce;
            envBelow.phase = env1Phase;
            envBelow.measurementType = env1MeasurementType;
            envBelow.mirrorAmount = env1MirrorAmount;
            envBelow.LFOSettings.LFOShape = env1LFOShape;
            envBelow.LFOSettings.LFOActiveCheckbox = env1LFOActiveCheckbox;
            envBelow.LFOSettings.LFOAcceleration = env1LFOAcceleration;
            envBelow.LFOSettings.LFOPulseWidth = env1LFOPulseWidth;
            envBelow.LFOSettings.LFOTrapezoidRatio = env1LFOTrapezoidRatio;
            envBelow.LFOSettings.LFOStepAmount = env1LFOStepAmount;
            envBelow.customEnvGridWidth = env1CustomEnvGridWidth;
            envBelow.customEnvGridHeight = env1CustomEnvGridHeight;
            envBelow.customEnvGridPoints = env1CustomEnvGridPoints;
            envBelow.alternateRange = env1AlternateRange;
        }

        instEnv.target = env2Target;
        instEnv.index = env2Index;
        instEnv.envelope = env2Envelope;
        instEnv.envelopeSpeed = env2Speed;
        instEnv.discrete = env2Discrete;
        instEnv.lowerBound = env2LowerBound;
        instEnv.upperBound = env2UpperBound;
        instEnv.delay = env2Delay;
        instEnv.pitchStart = env2PitchStart;
        instEnv.pitchEnd = env2PitchEnd;
        instEnv.pitchAmplify = env2PitchAmplify;
        instEnv.pitchBounce = env2PitchBounce;
        instEnv.phase = env2Phase;
        instEnv.measurementType = env2MeasurementType;
        instEnv.mirrorAmount = env2MirrorAmount;
        instEnv.LFOSettings.LFOShape = env2LFOShape;
        instEnv.LFOSettings.LFOActiveCheckbox = env2LFOActiveCheckbox;
        instEnv.LFOSettings.LFOAcceleration = env2LFOAcceleration;
        instEnv.LFOSettings.LFOPulseWidth = env2LFOPulseWidth;
        instEnv.LFOSettings.LFOTrapezoidRatio = env2LFOTrapezoidRatio;
        instEnv.LFOSettings.LFOStepAmount = env2LFOStepAmount;
        instEnv.customEnvGridWidth = env2CustomEnvGridWidth;
        instEnv.customEnvGridHeight = env2CustomEnvGridHeight;
        instEnv.customEnvGridPoints = env2CustomEnvGridPoints;
        instEnv.alternateRange = env2AlternateRange;
        
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeDrumsetEnvelopeOrder extends Change {
    constructor(doc: SongDocument, index: number, moveWhere: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const drumEnv = instrument.drumsetEnvelopes[index];
        // This is flipped because the drum order is flipped.
        // moveWhere:  False = Up, True = Down
        let idxUp = mod(index - 1, Config.drumCount);
        let idxDown = mod(index + 1, Config.drumCount);
        const envAbove = instrument.drumsetEnvelopes[idxUp];
        const envBelow = instrument.drumsetEnvelopes[idxDown];

        let env1Envelope = drumEnv.envelope;
        let env1Speed = drumEnv.envelopeSpeed;
        let env1Discrete = drumEnv.discrete;
        let env1LowerBound = drumEnv.lowerBound;
        let env1UpperBound = drumEnv.upperBound;
        let env1Delay = drumEnv.delay;
        let env1Phase = drumEnv.phase;
        let env1MeasurementType = drumEnv.measurementType;
        let env1MirrorAmount = drumEnv.mirrorAmount;
        let env1LFOShape = drumEnv.LFOSettings.LFOShape;
        let env1LFOActiveCheckbox = drumEnv.LFOSettings.LFOActiveCheckbox;
        let env1LFOAcceleration = drumEnv.LFOSettings.LFOAcceleration;
        let env1LFOPulseWidth = drumEnv.LFOSettings.LFOPulseWidth;
        let env1LFOTrapezoidRatio = drumEnv.LFOSettings.LFOTrapezoidRatio;
        let env1LFOStepAmount = drumEnv.LFOSettings.LFOStepAmount;
        let env1CustomEnvGridWidth = drumEnv.customEnvGridWidth;
        let env1CustomEnvGridHeight = drumEnv.customEnvGridHeight;
        let env1CustomEnvGridPoints = drumEnv.customEnvGridPoints;

        let env2Envelope, env2Speed, env2Discrete, env2LowerBound, env2UpperBound, env2Delay, env2Phase, env2MeasurementType, env2MirrorAmount, env2LFOShape, env2LFOActiveCheckbox, env2LFOAcceleration, env2LFOPulseWidth, env2LFOTrapezoidRatio, env2LFOStepAmount, env2CustomEnvGridWidth, env2CustomEnvGridHeight, env2CustomEnvGridPoints;
        if (moveWhere) {
            env2Envelope = envAbove.envelope;
            env2Speed = envAbove.envelopeSpeed;
            env2Discrete = envAbove.discrete;
            env2LowerBound = envAbove.lowerBound;
            env2UpperBound = envAbove.upperBound;
            env2Delay = envAbove.delay;
            env2Phase = envAbove.phase;
            env2MeasurementType = envAbove.measurementType;
            env2MirrorAmount = envAbove.mirrorAmount;
            env2LFOShape = envAbove.LFOSettings.LFOShape;
            env2LFOActiveCheckbox = envAbove.LFOSettings.LFOActiveCheckbox;
            env2LFOAcceleration = envAbove.LFOSettings.LFOAcceleration;
            env2LFOPulseWidth = envAbove.LFOSettings.LFOPulseWidth;
            env2LFOTrapezoidRatio = envAbove.LFOSettings.LFOTrapezoidRatio;
            env2LFOStepAmount = envAbove.LFOSettings.LFOStepAmount;
            env2CustomEnvGridWidth = envAbove.customEnvGridWidth;
            env2CustomEnvGridHeight = envAbove.customEnvGridHeight;
            env2CustomEnvGridPoints = envAbove.customEnvGridPoints;

            envAbove.envelope = env1Envelope;
            envAbove.envelopeSpeed = env1Speed;
            envAbove.discrete = env1Discrete;
            envAbove.lowerBound = env1LowerBound;
            envAbove.upperBound = env1UpperBound;
            envAbove.delay = env1Delay;
            envAbove.phase = env1Phase;
            envAbove.measurementType = env1MeasurementType;
            envAbove.mirrorAmount = env1MirrorAmount;
            envAbove.LFOSettings.LFOShape = env1LFOShape;
            envAbove.LFOSettings.LFOActiveCheckbox = env1LFOActiveCheckbox;
            envAbove.LFOSettings.LFOAcceleration = env1LFOAcceleration;
            envAbove.LFOSettings.LFOPulseWidth = env1LFOPulseWidth;
            envAbove.LFOSettings.LFOTrapezoidRatio = env1LFOTrapezoidRatio;
            envAbove.LFOSettings.LFOStepAmount = env1LFOStepAmount;
            envAbove.customEnvGridWidth = env1CustomEnvGridWidth;
            envAbove.customEnvGridHeight = env1CustomEnvGridHeight;
            envAbove.customEnvGridPoints = env1CustomEnvGridPoints;
        } else {
            env2Envelope = envBelow.envelope;
            env2Speed = envBelow.envelopeSpeed;
            env2Discrete = envBelow.discrete;
            env2LowerBound = envBelow.lowerBound;
            env2UpperBound = envBelow.upperBound;
            env2Delay = envBelow.delay;
            env2Phase = envBelow.phase;
            env2MeasurementType = envBelow.measurementType;
            env2MirrorAmount = envBelow.mirrorAmount;
            env2LFOShape = envBelow.LFOSettings.LFOShape;
            env2LFOActiveCheckbox = envBelow.LFOSettings.LFOActiveCheckbox;
            env2LFOAcceleration = envBelow.LFOSettings.LFOAcceleration;
            env2LFOPulseWidth = envBelow.LFOSettings.LFOPulseWidth;
            env2LFOTrapezoidRatio = envBelow.LFOSettings.LFOTrapezoidRatio;
            env2LFOStepAmount = envBelow.LFOSettings.LFOStepAmount;
            env2CustomEnvGridWidth = envBelow.customEnvGridWidth;
            env2CustomEnvGridHeight = envBelow.customEnvGridHeight;
            env2CustomEnvGridPoints = envBelow.customEnvGridPoints;

            envBelow.envelope = env1Envelope;
            envBelow.envelopeSpeed = env1Speed;
            envBelow.discrete = env1Discrete;
            envBelow.lowerBound = env1LowerBound;
            envBelow.upperBound = env1UpperBound;
            envBelow.delay = env1Delay;
            envBelow.phase = env1Phase;
            envBelow.measurementType = env1MeasurementType;
            envBelow.mirrorAmount = env1MirrorAmount;
            envBelow.LFOSettings.LFOShape = env1LFOShape;
            envBelow.LFOSettings.LFOActiveCheckbox = env1LFOActiveCheckbox;
            envBelow.LFOSettings.LFOAcceleration = env1LFOAcceleration;
            envBelow.LFOSettings.LFOPulseWidth = env1LFOPulseWidth;
            envBelow.LFOSettings.LFOTrapezoidRatio = env1LFOTrapezoidRatio;
            envBelow.LFOSettings.LFOStepAmount = env1LFOStepAmount;
            envBelow.customEnvGridWidth = env1CustomEnvGridWidth;
            envBelow.customEnvGridHeight = env1CustomEnvGridHeight;
            envBelow.customEnvGridPoints = env1CustomEnvGridPoints;
        }

        drumEnv.envelope = env2Envelope;
        drumEnv.envelopeSpeed = env2Speed;
        drumEnv.discrete = env2Discrete;
        drumEnv.lowerBound = env2LowerBound;
        drumEnv.upperBound = env2UpperBound;
        drumEnv.delay = env2Delay;
        drumEnv.phase = env2Phase;
        drumEnv.measurementType = env2MeasurementType;
        drumEnv.mirrorAmount = env2MirrorAmount;
        drumEnv.LFOSettings.LFOShape = env2LFOShape;
        drumEnv.LFOSettings.LFOActiveCheckbox = env2LFOActiveCheckbox;
        drumEnv.LFOSettings.LFOAcceleration = env2LFOAcceleration;
        drumEnv.LFOSettings.LFOPulseWidth = env2LFOPulseWidth;
        drumEnv.LFOSettings.LFOTrapezoidRatio = env2LFOTrapezoidRatio;
        drumEnv.LFOSettings.LFOStepAmount = env2LFOStepAmount;
        drumEnv.customEnvGridWidth = env2CustomEnvGridWidth;
        drumEnv.customEnvGridHeight = env2CustomEnvGridHeight;
        drumEnv.customEnvGridPoints = env2CustomEnvGridPoints;
        
        doc.notifier.changed();
        this._didSomething();
    }
}