/*!
Copyright (c) 2012-2022 John Nesky and contributing authors

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

import { clamp, mod } from "../editor/UsefulCodingStuff";

export interface Dictionary<T> {
    [K: string]: T;
}

export interface DictionaryArray<T> extends ReadonlyArray<T> {
    dictionary: Dictionary<T>;
}

export const enum FilterType {
    lowPass,
    highPass,
    peak,
    length,
}

export const enum SustainType {
	bright,
	acoustic,
	length,
}

export const enum EnvelopeType {
    noteSize,
    none,
    punch,
    flare,
    twang,
    swell,
    decay,
    modboxBlip,
    modboxTrill,
    modboxClick,
    modboxBow,
    wibble,
    linear,
    rise,
    jummboxBlip,
    pitch,
    LFO,
    dogebox2Clap,
    custom,
}


export const enum InstrumentType {
    chip,
    fm,
    noise,
    spectrum,
    drumset,
    harmonics,
    pwm,
    pickedString,
    supersaw,
    customChipWave,
    wavetable,
    advfm,
//  Issue#58 - Add a synth/pad instrument type. May require some more thinking about before going about implementation.
//  synth,
//  Issue#14 - Add an advanced drumset drum type, which will be like how ADVFM is to FM (except it's ADVDrumset to Drumset).
//  advdrumset,
    mod,
    length,
}

export const enum DropdownID {
    Vibrato     = 0,
    Pan         = 1,
    Chord       = 2,
    Transition  = 3,
    FM          = 4,
    Strum       = 5,
    Envelope    = 6,
    Unison      = 7,
    PerEnvelope = 8,
    DrumsetEnv  = 9,
    AdvSettings = 10,
}

export const enum EffectType {
    reverb,
    chorus,
    panning,
    distortion,
    bitcrusher,
    noteFilter,
    echo,
    pitchShift,
    detune,
    vibrato,
    transition,
    chord,
    wavefold,
    clipper,
    length,
}

export const enum EnvelopeComputeIndex {
    noteVolume,
    noteFilterAllFreqs,
    pulseWidth,
    stringSustain,
    unison,
    operatorFrequency0, operatorFrequency1, operatorFrequency2, operatorFrequency3, operatorFrequency4, operatorFrequency5,
    operatorAmplitude0, operatorAmplitude1, operatorAmplitude2, operatorAmplitude3, operatorAmplitude4, operatorAmplitude5,
    operatorPulseWidth0, operatorPulseWidth1, operatorPulseWidth2, operatorPulseWidth3, operatorPulseWidth4, operatorPulseWidth5,
    feedbackAmplitude,
    pitchShift,
    detune,
    vibratoDepth,
    noteFilterFreq0, noteFilterFreq1, noteFilterFreq2, noteFilterFreq3, noteFilterFreq4, noteFilterFreq5, noteFilterFreq6, noteFilterFreq7,
    noteFilterGain0, noteFilterGain1, noteFilterGain2, noteFilterGain3, noteFilterGain4, noteFilterGain5, noteFilterGain6, noteFilterGain7,
    supersawDynamism,
	supersawSpread,
	supersawShape,
    distortion,
    bitCrusher,
    freqCrusher,
    chorus,
    reverb,
    clipBounds,
    wavefoldBounds,
    length,
}

export interface BeepBoxOption {
    readonly index: number;
    readonly name:  string;
}

export interface Scale extends BeepBoxOption {
    readonly flags:    ReadonlyArray<boolean>;
    readonly realName: string;
}

export interface Key extends BeepBoxOption {
    readonly isWhiteKey: boolean;
    readonly basePitch:  number;
}

export interface Rhythm extends BeepBoxOption {
    readonly stepsPerBeat:      number;
    readonly roundUpThresholds: number[] | null;
}

export interface ChipWave extends BeepBoxOption {
    readonly expression: number;
    samples:             Float32Array;
}

export interface OperatorWave extends BeepBoxOption {
    samples: Float32Array;
}

export interface ChipNoise extends BeepBoxOption {
    readonly expression:      number;
    readonly basePitch:       number;
    readonly pitchFilterMult: number;
    readonly isSoft:          boolean;
    samples:                  Float32Array | null;
}

export interface Transition extends BeepBoxOption {
    readonly isSeamless:              boolean;
    readonly continues:               boolean;
    readonly slides:                  boolean;
    readonly slideTicks:              number;
    readonly includeAdjacentPatterns: boolean;
}

export interface Vibrato extends BeepBoxOption {
    readonly amplitude:  number;
    readonly type:       number;
    readonly delayTicks: number;
}

export interface VibratoType extends BeepBoxOption {
    readonly periodsSeconds: number[];
    readonly period:         number;
}

export interface Unison extends BeepBoxOption {
    readonly voices:     number;
    readonly spread:     number;
    readonly offset:     number;
    readonly expression: number;
    readonly sign:       number;
}

export interface Modulator extends BeepBoxOption {
    readonly name:             string;     
    readonly pianoName:        string;     
    readonly maxRawVol:        number;     
    readonly newNoteVol:       number;     
    readonly forSong:          boolean;    
    convertRealFactor:         number;
//  readonly checkboxMod:      boolean;
//  The commented out thing above is for deciding if a modulator is for something that can only have
//  two values, and thus would be like a checkbox modulator of sorts. Refer to below.
//  Issue#47 - Add modulators specifically created for changing boolean-like elements, primarily checkboxes.
    readonly associatedEffect: EffectType; 
    readonly promptName:       string;     
    readonly promptDesc:       string[];   

}

export interface Chord extends BeepBoxOption {
    readonly customInterval: boolean;
    readonly arpeggiates:    boolean;
    readonly strumParts:     number;
    readonly singleTone:     boolean;
}

export interface Algorithm extends BeepBoxOption {
    readonly carrierCount:      number;
    readonly associatedCarrier: ReadonlyArray<number>;
    readonly modulatedBy:       ReadonlyArray<ReadonlyArray<number>>;
}

export interface OperatorFrequency extends BeepBoxOption {
    readonly mult:          number;
    readonly hzOffset:      number;
    readonly amplitudeSign: number;
}

export interface Feedback extends BeepBoxOption {
    readonly indices: ReadonlyArray<ReadonlyArray<number>>;
}

export interface EnvelopeCategory extends BeepBoxOption {
    readonly envelopes: ReadonlyArray<Envelope>
}

export interface Envelope extends BeepBoxOption {
    readonly type:  EnvelopeType;
    readonly speed: number;
}

export interface DrumsetEnvelope extends BeepBoxOption {
    readonly type:  EnvelopeType;
    readonly speed: number;
}

export interface AutomationTarget extends BeepBoxOption {
    readonly computeIndex:          EnvelopeComputeIndex | null;
    readonly displayName:           string;
    readonly interleave:            boolean; // Whether to interleave this target with the next one in the menu (e.g. filter frequency and gain).
	readonly isFilter:              boolean; // Filters are special because the maxCount depends on other instrument settings.
    readonly maxCount:              number;
    readonly effect:                EffectType | null;
    readonly compatibleInstruments: InstrumentType[] | null;
}

export class Config {
    public static thresholdVal: number = -10;
    public static kneeVal:      number = 40;
    public static ratioVal:     number = 12;
    public static attackVal:    number = 0;
    public static releaseVal:   number = 0.25;

    public static jsonFormat: string = "midbox";

    public static readonly scales: DictionaryArray<Scale> = toNameMap([
//        The keys in a scale:                                         C     C#|Db  D      D#|Eb  E      F      F#|Gb  G      Ab|G#  A      Bb|A#  B      
        { name: "Free",              realName: "Free / Chromatic",  flags: [true, true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true ]}, 
        { name: "Major",             realName: "Major",             flags: [true, false, true,  false, true,  true,  false, true,  false, true,  false, true ]},
        { name: "Minor",             realName: "Minor",             flags: [true, false, true,  true,  false, true,  false, true,  true,  false, true,  false]},
        { name: "Mixolydian",        realName: "Mixolydian",        flags: [true, false, true,  false, true,  true,  false, true,  false, true,  true,  false]}, 
        { name: "Lydian",            realName: "Lydian",            flags: [true, false, true,  false, true,  false, true,  true,  false, true,  false, true ]}, 
        { name: "Dorian",            realName: "Dorian",            flags: [true, false, true,  true,  false, true,  false, true,  false, true,  true,  false]}, 
        { name: "Phrygian",          realName: "Phrygian",          flags: [true, true,  false, true,  false, true,  false, true,  true,  false, true,  false]}, 
        { name: "Locrian",           realName: "Locrian",           flags: [true, true,  false, true,  false, true,  true,  false, true,  false, true,  false]}, 
        { name: "Lydian Dominant",   realName: "Lydian Dominant",   flags: [true, false, true,  false, true,  false, true,  true,  false, true,  true,  false]}, 
        { name: "Phrygian Dominant", realName: "Phrygian Dominant", flags: [true, true,  false, false, true,  true,  false, true,  true,  false, true,  false]}, 
        { name: "Harmonic Major",    realName: "Harmonic Major",    flags: [true, false, true,  false, true,  true,  false, true,  true,  false, false, true ]},
        { name: "Harmonic Minor",    realName: "Harmonic Minor",    flags: [true, false, true,  true,  false, true,  false, true,  true,  false, false, true ]},
        { name: "Melodic Minor",     realName: "Melodic Minor",     flags: [true, false, true,  true,  false, true,  false, true,  false, true,  false, true ]},
        { name: "Blues",             realName: "Blues",             flags: [true, false, false, true,  false, true,  true,  true,  false, false, true,  false]},
        { name: "Altered",           realName: "Altered",           flags: [true, true,  false, true,  true,  false, true,  false, true,  false, true,  false]}, 
        { name: "Major Pentatonic",  realName: "Major Pentatonic",  flags: [true, false, true,  false, true,  false, false, true,  false, true,  false, false]},
        { name: "Minor Pentatonic",  realName: "Minor Pentatonic",  flags: [true, false, false, true,  false, true,  false, true,  false, false, true,  false]}, 
        { name: "Whole Tone",        realName: "Whole Tone",        flags: [true, false, true,  false, true,  false, true,  false, true,  false, true,  false]}, 
        { name: "Octatonic",         realName: "Octatonic",         flags: [true, false, true,  true,  false, true,  true,  false, true,  true,  false, true ]}, 
        { name: "Hexatonic",         realName: "Hexatonic",         flags: [true, false, false, true,  true,  false, false, true,  true,  false, false, true ]},
//        Nothing will really matter for this one. These are just placeholder values until the user configures them as this is the custom scale.
        { name: "Custom Scale",      realName: "Custom Scale",      flags: [true, false, true,  true,  false, false, false, true,  true,  false, true,  true ]},
    ]);

    public static readonly keys: DictionaryArray<Key> = toNameMap([
        { name: "C",  isWhiteKey: true,  basePitch: 12 },
        { name: "C♯", isWhiteKey: false, basePitch: 13 },
        { name: "D",  isWhiteKey: true,  basePitch: 14 },
        { name: "D♯", isWhiteKey: false, basePitch: 15 },
        { name: "E",  isWhiteKey: true,  basePitch: 16 },
        { name: "F",  isWhiteKey: true,  basePitch: 17 },
        { name: "F♯", isWhiteKey: false, basePitch: 18 },
        { name: "G",  isWhiteKey: true,  basePitch: 19 },
        { name: "G♯", isWhiteKey: false, basePitch: 20 },
        { name: "A",  isWhiteKey: true,  basePitch: 21 },
        { name: "A♯", isWhiteKey: false, basePitch: 22 },
        { name: "B",  isWhiteKey: true,  basePitch: 23 },
    ]);

    public static readonly songTitleCharLimit:        number = 63;
    public static readonly songSubtitleCharLimit:     number = 63;
    public static readonly channelNameCharLimit:      number = 63;
    public static readonly blackKeyNameParents:       ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
    public static readonly tempoMin:                  number = 1;
    public static readonly tempoMax:                  number = 750;
    public static readonly octaveMin:                 number = -2;
	public static readonly octaveMax:                 number = 2;
    public static readonly echoDelayRange:            number = 24;
    public static readonly echoDelayStepTicks:        number = 4;
    public static readonly echoDelayMax:              number = 8;
    public static readonly echoDelayIntervals:        number = 0.001;
    public static readonly echoDelaySliderNumbers:    ReadonlyArray<number> = [0, 0.083, 0.167, 0.25, 0.333, 0.417, 0.5, 0.583, 0.667, 0.75, 0.833, 0.917, 1, 1.083, 1.167, 1.25, 1.333, 1.417, 1.5, 1.583, 1.667, 1.75, 1.833, 1.917, 2, 2.083, 2.167, 2.25, 2.333, 2.417, 2.5, 2.583, 2.667, 2.75, 2.833, 2.917, 3, 3.083, 3.167, 3.25, 3.333, 3.417, 3.5, 3.583, 3.667, 3.75, 3.833, 3.917, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.5, 7, 7.5, 8];
    public static readonly echoSustainRange:          number = 8;
    public static readonly echoShelfHz:               number = 4000.0; 
    public static readonly echoShelfGain:             number = Math.pow(2.0, -0.5);
    public static readonly reverbShelfHz:             number = 8000.0; 
    public static readonly reverbShelfGain:           number = Math.pow(2.0, -1.5);
    public static readonly reverbRange:               number = 32;
    public static readonly reverbDelayBufferSize:     number = 16384; 
    public static readonly reverbDelayBufferMask:     number = Config.reverbDelayBufferSize - 1; 
    public static readonly beatsPerBarMin:            number = 1;
    public static readonly beatsPerBarMax:            number = 32;
    public static readonly barCountMin:               number = 1;
    public static readonly barCountMax:               number = 512;
    public static readonly instrumentCountMin:        number = 1;
    public static readonly layeredInstrumentCountMax: number = 10;
    public static readonly patternInstrumentCountMax: number = 10;
    public static readonly partsPerBeat:              number = 24;
    public static readonly ticksPerPart:              number = 2;
    public static readonly ticksPerArpeggio:          number = 3;

//  Normal variants.
    public static readonly normalArpeggioPatterns:             ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 2],    [0, 1, 2, 3],       [0, 1, 2, 3, 4],          [0, 1, 2, 3, 4, 5],             [0, 1, 2, 3, 4, 5, 6],                [0, 1, 2, 3, 4, 5, 6, 7],                   [0, 1, 2, 3, 4, 5, 6, 7, 8]                     ];
  //This one is mostly the same as Normal, but the third case bounces back. Kept to not break songs reliant on this.
    public static readonly legacyArpeggioPatterns:             ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 2, 1], [0, 1, 2, 3],       [0, 1, 2, 3, 4],          [0, 1, 2, 3, 4, 5],             [0, 1, 2, 3, 4, 5, 6],                [0, 1, 2, 3, 4, 5, 6, 7],                   [0, 1, 2, 3, 4, 5, 6, 7, 8]                     ];
    public static readonly scrambleArpeggioPatterns:           ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 0, 2], [0, 1, 0, 2, 3],    [0, 1, 0, 2, 3, 2, 4, 2], [0, 1, 0, 2, 3, 4, 3, 5],       [0, 1, 0, 2, 3, 4, 6, 5],             [0, 1, 0, 2, 3, 2, 4, 2, 6, 5, 7, 5],       [0, 1, 0, 2, 3, 4, 3, 5, 6, 7, 6, 8]            ];
    public static readonly oscillateArpeggioPatterns:          ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 0, 2], [0, 1, 0, 2, 0, 3], [0, 1, 0, 2, 0, 3, 0, 4], [0, 1, 0, 2, 0, 3, 0, 4, 0, 5], [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6], [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7], [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 8]];
    public static readonly escalateArpeggioPatterns:           ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 0, 2], [0, 1, 0, 2, 1, 3], [0, 1, 0, 2, 1, 3, 2, 4], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8]];
    public static readonly shiftArpeggioPatterns:              ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 2, 1],    [0, 3, 1, 2],       [0, 4, 1, 3, 2],          [0, 5, 1, 4, 2, 3],             [0, 6, 1, 5, 2, 4, 3],                [0, 7, 1, 6, 2, 5, 3, 4],                   [0, 8, 1, 7, 2, 6, 3, 5, 4]                     ];
//  Bounce variants.
    public static readonly normalBounceArpeggioPatterns:       ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 2, 1],             [0, 1, 2, 3, 2, 1],                   [0, 1, 2, 3, 4, 3, 2, 1],                         [0, 1, 2, 3, 4, 5, 4, 3, 2, 1],                               [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],                                     [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1],                                           [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]                                                ];
    public static readonly scrambleBounceArpeggioPatterns:     ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 0, 2, 1],          [0, 1, 0, 2, 3, 1],                   [0, 1, 0, 2, 3, 2, 4, 2, 3, 1],                   [0, 1, 0, 2, 3, 4, 3, 5, 4, 2],                               [0, 1, 0, 2, 3, 4, 6, 5, 3, 1],                                           [0, 1, 0, 2, 3, 2, 4, 2, 6, 5, 7, 5, 4, 3, 2, 1],                                     [0, 1, 0, 2, 3, 4, 3, 5, 6, 7, 6, 8, 0, 1, 0, 2]                                                ];
    public static readonly oscillateBounceArpeggioPatterns:    ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 0, 2],             [0, 1, 0, 2, 0, 3, 0, 2],             [0, 1, 0, 2, 0, 3, 0, 4, 0, 3, 0, 2],             [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 4, 0, 3, 0, 2],             [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 5, 0, 4, 0, 3, 0, 2],             [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 6, 0, 5, 0, 4, 0, 3, 0, 2],             [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 8, 0, 7, 0, 6, 0, 5, 0, 4, 0, 3, 0, 2]            ];
    public static readonly escalateBounceArpeggioPatterns:     ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 0, 2, 1, 0, 1],    [0, 1, 0, 2, 1, 3, 2, 0, 2, 3, 1, 2], [0, 1, 0, 2, 1, 3, 2, 4, 3, 0, 3, 4, 2, 3, 1, 2], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 0, 4, 5, 3, 4, 2, 3, 1, 2], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 0, 5, 6, 4, 5, 3, 4, 2, 3, 1, 2], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 0, 6, 7, 5, 6, 4, 5, 3, 4, 2, 3, 1, 2], [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 0, 7, 8, 6, 7, 5, 6, 4, 5, 3, 4, 2, 3, 1, 2]];
    public static readonly shiftBounceArpeggioPatterns:        ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 2, 1, 2],             [0, 3, 1, 2, 1, 3],                   [0, 4, 1, 3, 2, 3, 1, 4],                         [0, 5, 1, 4, 2, 3, 2, 4, 1, 5],                               [0, 6, 1, 5, 2, 4, 3, 4, 2, 5, 1, 6],                                     [0, 7, 1, 6, 2, 5, 3, 4, 3, 5, 2, 6, 1, 7],                                           [0, 8, 1, 7, 2, 6, 3, 5, 4, 5, 3, 6, 2, 7, 1, 8]                                                ];

    public static readonly rhythms: DictionaryArray<Rhythm> = toNameMap([
        { name: "÷3 (triplets)", stepsPerBeat: 3,  roundUpThresholds: [5, 12, 18    ]},
        { name: "÷4 (standard)", stepsPerBeat: 4,  roundUpThresholds: [3, 9,  17, 21]},
        { name: "÷6",            stepsPerBeat: 6,  roundUpThresholds: null           },
        { name: "÷8",            stepsPerBeat: 8,  roundUpThresholds: null           },
        { name: "freehand",      stepsPerBeat: 24, roundUpThresholds: null           },
    ]);

    public static readonly instrumentTypeNames:              ReadonlyArray<string> =  ["chip", "FM", "noise", "spectrum", "drumset", "harmonics", "PWM", "Picked String", "supersaw", "custom chip", "wavetable", "ADVFM", "mod"   ];
    public static readonly instrumentTypeHasSpecialInterval: ReadonlyArray<boolean> = [ true,   true, false,   false,      false,     true,        false, false,           false,      false,         false,       false  /*None */]; // For the custom interval chord type.
    public static readonly chipBaseExpression:               number = 0.03375;   // Doubled by unison feature, but affected by expression adjustments per unison setting and wave shape.
    public static readonly fmBaseExpression:                 number = 0.03;
    public static readonly noiseBaseExpression:              number = 0.19;
    public static readonly spectrumBaseExpression:           number = 0.3;       // Spectrum can be in pitch or noise channels, the expression is doubled for noise.
    public static readonly drumsetBaseExpression:            number = 0.45;      // Drums tend to be loud but brief!
    public static readonly harmonicsBaseExpression:          number = 0.025;
    public static readonly pwmBaseExpression:                number = 0.04725;   // It's actually closer to half of this, the synthesized pulse amplitude range is only .5 to -.5, but also note that the fundamental sine partial amplitude of a square wave is 4/π times the measured square wave amplitude.
    public static readonly supersawBaseExpression:           number = 0.061425;  // It's actually closer to half of this, the synthesized sawtooth amplitude range is only .5 to -.5.
    public static readonly pickedStringBaseExpression:       number = 0.025;     // Same as harmonics.
    public static readonly wavetableBaseExpression:          number = 0.03375;   // Gonna keep it the same as chipBaseExpression.
    public static readonly distortionBaseVolume:             number = 0.011;     // Distortion is not affected by pitchDamping, which otherwise approximately halves expression for notes around the middle of the range.
    public static readonly bitcrusherBaseVolume:             number = 0.010;     // Also not affected by pitchDamping, used when bit crushing is maxed out (aka "1-bit" output).

    public static readonly rawChipWaves: DictionaryArray<ChipWave> = toNameMap([
        { name: "rounded",         expression: 0.94,  samples: centerWave            ([0.0,   0.2,   0.4,   0.5,  0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2])},
        { name: "triangle",        expression: 1.0,   samples: centerWave            ([1.0 /  15.0,  3.0 /  15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0])},
        { name: "square",          expression: 0.5,   samples: centerWave            ([1.0,  -1.0])},
        { name: "1/4 pulse",       expression: 0.5,   samples: centerWave            ([1.0,  -1.0,  -1.0,  -1.0])},
        { name: "1/6 pulse",       expression: 0.55,  samples: centerWave            ([1.0,  -1.0,  -1.0,  -1.0, -1.0, -1.0])},
        { name: "1/8 pulse",       expression: 0.5,   samples: centerWave            ([1.0,  -1.0,  -1.0,  -1.0, -1.0, -1.0, -1.0, -1.0])},
        { name: "1/12 pulse",      expression: 0.55,  samples: centerWave            ([1.0,  -1.0,  -1.0,  -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
        { name: "1/16 pulse",      expression: 0.575, samples: centerWave            ([1.0,  -1.0,  -1.0,  -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
        { name: "heavy saw",       expression: 0.5,   samples: centerWave            ([1.0,  -1.0,   2.0,  -1.0,  0.0, 3.0, 1.0, -1.0, 2.0, -1.0, 0.0, 0.0])},
        { name: "bass-y",          expression: 0.25,  samples: centerWave            ([1.0,  -5.0,   4.0,  -3.0,  7.0, -2.0, 3.0, -3.0, 6.0])},
        { name: "strange",         expression: 0.125, samples: centerWave            ([1.0,   11.0,  1.0,  -11.0, -1.0, -11.0, 4.0, -6.0, 9.0, -1.0, -7.0, 11.0, 2.0, -5.0, 9.0, 9.0, -10.0])},
        { name: "sawtooth",        expression: 0.65,  samples: centerWave            ([1.0 /  31.0,  3.0 /  31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0])},
        { name: "double saw",      expression: 0.5,   samples: centerWave            ([0.0,  -0.2,  -0.4,  -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2])},
        { name: "double pulse",    expression: 0.4,   samples: centerWave            ([1.0,   1.0,   1.0,   1.0,  1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0])},
        { name: "spiky",           expression: 0.4,   samples: centerWave            ([1.0,  -1.0,   1.0,  -1.0,  1.0, 0.0])},
        { name: "sine",            expression: 0.88,  samples: centerAndNormalizeWave([8.0,   9.0,   11.0,  12.0, 13.0, 14.0, 15.0, 15.0, 15.0, 15.0, 14.0, 14.0, 13.0, 11.0, 10.0, 9.0, 7.0, 6.0, 4.0, 3.0, 2.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 2.0, 4.0, 5.0, 6.0])},
        { name: "flute",           expression: 0.8,   samples: centerAndNormalizeWave([3.0,   4.0,   6.0,   8.0,  10.0, 11.0, 13.0, 14.0, 15.0, 15.0, 14.0, 13.0, 11.0, 8.0, 5.0, 3.0])},
        { name: "harp",            expression: 0.8,   samples: centerAndNormalizeWave([0.0,   3.0,   3.0,   3.0,  4.0, 5.0, 5.0, 6.0, 7.0, 8.0, 9.0, 11.0, 11.0, 13.0, 13.0, 15.0, 15.0, 14.0, 12.0, 11.0, 10.0, 9.0, 8.0, 7.0, 7.0, 5.0, 4.0, 3.0, 2.0, 1.0, 0.0, 0.0])},
        { name: "sharp clarinet",  expression: 0.38,  samples: centerAndNormalizeWave([0.0,   0.0,   0.0,   1.0,  1.0, 8.0, 8.0, 9.0, 9.0, 9.0, 8.0, 8.0, 8.0, 8.0, 8.0, 9.0, 9.0, 7.0, 9.0, 9.0, 10.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])},
        { name: "soft clarinet",   expression: 0.45,  samples: centerAndNormalizeWave([0.0,   1.0,   5.0,   8.0,  9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 11.0, 11.0, 12.0, 13.0, 12.0, 10.0, 9.0, 7.0, 6.0, 4.0, 3.0, 3.0, 3.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])},
        { name: "alto sax",        expression: 0.3,   samples: centerAndNormalizeWave([5.0,   5.0,   6.0,   4.0,  3.0, 6.0, 8.0, 7.0, 2.0, 1.0, 5.0, 6.0, 5.0, 4.0, 5.0, 7.0, 9.0, 11.0, 13.0, 14.0, 14.0, 14.0, 14.0, 13.0, 10.0, 8.0, 7.0, 7.0, 4.0, 3.0, 4.0, 2.0])},
        { name: "bassoon",         expression: 0.35,  samples: centerAndNormalizeWave([9.0,   9.0,   7.0,   6.0,  5.0, 4.0, 4.0, 4.0, 4.0, 5.0, 7.0, 8.0, 9.0, 10.0, 11.0, 13.0, 13.0, 11.0, 10.0, 9.0, 7.0, 6.0, 4.0, 2.0, 1.0, 1.0, 1.0, 2.0, 2.0, 5.0, 11.0, 14.0])},
        { name: "trumpet",         expression: 0.22,  samples: centerAndNormalizeWave([10.0,  11.0,  8.0,   6.0,  5.0, 5.0, 5.0, 6.0, 7.0, 7.0, 7.0, 7.0, 6.0, 6.0, 7.0, 7.0, 7.0, 7.0, 7.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 7.0, 8.0, 9.0, 11.0, 14.0])},
        { name: "electric guitar", expression: 0.2,   samples: centerAndNormalizeWave([11.0,  12.0,  12.0,  10.0, 6.0, 6.0, 8.0, 0.0, 2.0, 4.0, 8.0, 10.0, 9.0, 10.0, 1.0, 7.0, 11.0, 3.0, 6.0, 6.0, 8.0, 13.0, 14.0, 2.0, 0.0, 12.0, 8.0, 4.0, 13.0, 11.0, 10.0, 13.0])},
        { name: "organ",           expression: 0.2,   samples: centerAndNormalizeWave([11.0,  10.0,  12.0,  11.0, 14.0, 7.0, 5.0, 5.0, 12.0, 10.0, 10.0, 9.0, 12.0, 6.0, 4.0, 5.0, 13.0, 12.0, 12.0, 10.0, 12.0, 5.0, 2.0, 2.0, 8.0, 6.0, 6.0, 5.0, 8.0, 3.0, 2.0, 1.0])},
        { name: "pan flute",       expression: 0.35,  samples: centerAndNormalizeWave([1.0,   4.0,   7.0,   6.0,  7.0, 9.0, 7.0, 7.0, 11.0, 12.0, 13.0, 15.0, 13.0, 11.0, 11.0, 12.0, 13.0, 10.0, 7.0, 5.0, 3.0, 6.0, 10.0, 7.0, 3.0, 3.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0])},
        { name: "glitch",          expression: 0.5,   samples: centerWave            ([1.0,   1.0,   1.0,   1.0,  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0])},
        { name: "accurate sine",   expression: 0.5,   samples: centerAndNormalizeWave([2,4,7,9,11,14,15,17,19,20,21,22,23,23,24,24,24,24,23,23,22,21,20,19,17,15,14,11,9,7,4,2,-2,-4,-7,-9,-11,-14,-15,-17,-19,-20,-21,-22,-23,-23,-24,-24,-24,-24,-23,-23,-22,-21,-20,-19,-17,-15,-14,-11,-9,-7,-4,-2])},
        { name: "accurate tri",    expression: 0.45,  samples: centerAndNormalizeWave([1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 23, 22, 20, 19, 17, 16, 14, 13, 11, 10, 8, 7, 5, 4, 2, 1, -1, -2, -4, -5, -7,-8, -10, -11, -13, -14, -16, -17, -19, -20, -22, -23, -23, -22, -20, -19, -17, -16, -14, -13, -11, -10, -8, -7, -5, -4, -2, -1])},
        { name: "secant",          expression: 0.35,  samples: centerAndNormalizeWave([22,20,17,15,13,10,9,7,5,4,3,2,1,1,0,0,0,0,1,1,2,3,4,5,7,9,10,13,15,17,20,22,-22,-20,-17,-15,-13,-10,-9,-7,-5,-4,-3,-2,-1,-1,0,0,0,0,-1,-1,-2,-3,-4,-5,-7,-9,-10,-13,-15,-17,-20,-22])},
        { name: "glitch 2",        expression: 0.2,   samples: centerAndNormalizeWave([0, 24, 0, 24, 0, 24, 0, 24, 0, -24, 0, -24, 0, -24, 0, -24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -24, 0, -24, 0, -24, 0, -24, 0, 24, 0, 24, 0, 24, 0, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])},
        { name: "trapezoid",       expression: 1.0,   samples: centerWave            ([1.0 / 15.0, 6.0 / 15.0, 10.0 / 15.0, 14.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 14.0 / 15.0, 10.0 / 15.0, 6.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -6.0 / 15.0, -10.0 / 15.0, -14.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -14.0 / 15.0, -10.0 / 15.0, -6.0 / 15.0, -1.0 / 15.0,])},
        { name: "accurate trapez", expression: 0.4,   samples: centerAndNormalizeWave([1, 4, 7, 10, 13, 16, 19, 22, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 22, 19, 16, 13, 10, 7, 4, 1, -1, -4, -7, -10, -13, -16, -19, -22, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -24, -22, -19, -16, -13, -10, -7, -4, -1])}
    ]);

    public static readonly chipWaves:  DictionaryArray<ChipWave>  = rawChipToIntegrated(Config.rawChipWaves);
//  Noise waves have too many samples to write by hand, so they're generated on-demand by getDrumWave instead.
    public static readonly chipNoises: DictionaryArray<ChipNoise> = toNameMap([
        { name: "retro",            expression: 0.25,  basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "white",            expression: 1.0,   basePitch: 69,    pitchFilterMult: 8.0,    isSoft: true,  samples: null },
        { name: "clang",            expression: 0.4,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "buzz",             expression: 0.3,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "hollow",           expression: 1.5,   basePitch: 96,    pitchFilterMult: 1.0,    isSoft: true,  samples: null },
        { name: "shine",            expression: 0.755, basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "deep",             expression: 1.5,   basePitch: 120,   pitchFilterMult: 1024.0, isSoft: true,  samples: null },
        { name: "cutter",           expression: 0.005, basePitch: 96,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "metallic",         expression: 1.0,   basePitch: 96,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "static",           expression: 0.625, basePitch: 96,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "retro clang",      expression: 1.0,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "chime",            expression: 2,     basePitch: 69,    pitchFilterMult: 1.0,    isSoft: true,  samples: null },
        { name: "harsh",            expression: 10,    basePitch: 69,    pitchFilterMult: 1.0,    isSoft: true,  samples: null },
        { name: "trill",            expression: 1.0,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: true,  samples: null },
        { name: "detuned periodic", expression: 0.3,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "snare",            expression: 1.0,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "1-bit white",      expression: 0.5,   basePitch: 74.41, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "1-bit metallic",   expression: 0.5,   basePitch: 86.41, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "crackling",        expression: 0.9,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "pink",             expression: 1.0,   basePitch: 69,    pitchFilterMult: 8.0,    isSoft: true,  samples: null },
        { name: "brownian",         expression: 1.0,   basePitch: 69,    pitchFilterMult: 8.0,    isSoft: true,  samples: null },
        { name: "perlin",           expression: 1.0,   basePitch: 85,    pitchFilterMult: 1.0,    isSoft: true,  samples: null },
        { name: "fractal",          expression: 1.0,   basePitch: 100,   pitchFilterMult: 1.0,    isSoft: true,  samples: null },
        { name: "vinyl crackle",    expression: 0.25,  basePitch: 96,    pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "noise square",     expression: 1.0,   basePitch: 69,    pitchFilterMult: 1024.0, isSoft: true,  samples: null },
    ]);

    public static readonly filterFreqStep:             number = 1.0 / 4.0;
    public static readonly filterFreqRange:            number = 34;
    public static readonly filterFreqReferenceSetting: number = 28;
    public static readonly filterFreqReferenceHz:      number = 8000.0;
    public static readonly filterFreqMaxHz:            number = Config.filterFreqReferenceHz * Math.pow(2.0, Config.filterFreqStep * (Config.filterFreqRange - 1 - Config.filterFreqReferenceSetting));
    public static readonly filterFreqMinHz:            number = 8.0;
    public static readonly filterGainRange:            number = 15;
    public static readonly filterGainCenter:           number = 7;
    public static readonly filterGainStep:             number = 1.0 / 2.0;
    public static readonly filterMaxPoints:            number = 12;
    public static readonly filterTypeNames:            ReadonlyArray<string> = ["low-pass", "high-pass", "peak"]; 
    public static readonly filterMorphCount:           number = 10; 
    public static readonly filterSimpleCutRange:       number = 11;
    public static readonly filterSimplePeakRange:      number = 8;
    public static readonly fadeInRange:                number = 12;
    public static readonly fadeOutTicks:               ReadonlyArray<number> = [-48, -36, -24, -12, -6, -3, -1, 6, 12, 24, 36, 48, 60, 72, 84, 96, 128, 160];
    public static readonly fadeOutNeutral:             number = 6;
    public static readonly drumsetFadeOutTicks:        number = 48;
    public static readonly transitions: DictionaryArray<Transition> = toNameMap([
        { name: "normal",              isSeamless: false, continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: false },
        { name: "interrupt",           isSeamless: true,  continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: true  },
        { name: "continue",            isSeamless: true,  continues: true,  slides: false, slideTicks: 3, includeAdjacentPatterns: true  },
        { name: "slide",               isSeamless: true,  continues: false, slides: true,  slideTicks: 3, includeAdjacentPatterns: true  },
    ]);

    public static readonly vibratos: DictionaryArray<Vibrato> = toNameMap([
        { name: "none",    amplitude: 0.0,  type: 0, delayTicks: 0  },
        { name: "light",   amplitude: 0.15, type: 0, delayTicks: 0  },
        { name: "delayed", amplitude: 0.3,  type: 0, delayTicks: 37 },
        { name: "heavy",   amplitude: 0.45, type: 0, delayTicks: 0  },
        { name: "shaky",   amplitude: 0.1,  type: 1, delayTicks: 0  },
    ]);

    public static readonly vibratoTypes: DictionaryArray<VibratoType> = toNameMap([
        { name: "normal", periodsSeconds: [0.14],                         period: 0.14   },
        { name: "shaky",  periodsSeconds: [0.11, 1.618 * 0.11, 3 * 0.11], period: 266.97 },
    ]);
//  MID TODO: Make the make the envelope speed not use arpSpeedScale.      0       1      2    3     4      5    6    7      8     9   10   11 12   13   14   15   16   17   18   19   20   21 22   23   24   25   26   27   28   29   30   31 32   33   34   35   36   37   38    39  40   41 42    43   44   45   46 47   48 49 50
    public static readonly arpSpeedScale:         ReadonlyArray<number> = [0, 0.0625, 0.125, 0.2, 0.25, 1 / 3, 0.4, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.15, 4.3, 4.5, 4.8, 5, 5.5, 6, 8];
    public static readonly strumSpeedScale:       ReadonlyArray<number> = [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    public static readonly slideSpeedScale:       ReadonlyArray<number> = [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    public static readonly wavetableSpeedScale:   ReadonlyArray<number> = [0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

    public static readonly unisons: DictionaryArray<Unison> = toNameMap([
        { name: "none",            voices: 1, spread: 0.0,    offset:  0.0,   expression: 1.4,  sign:  1.0 },
        { name: "shimmer",         voices: 2, spread: 0.018,  offset:  0.0,   expression: 0.8,  sign:  1.0 },
        { name: "hum",             voices: 2, spread: 0.045,  offset:  0.0,   expression: 1.0,  sign:  1.0 },
        { name: "honky tonk",      voices: 2, spread: 0.09,   offset:  0.0,   expression: 1.0,  sign:  1.0 },
        { name: "dissonant",       voices: 2, spread: 0.25,   offset:  0.0,   expression: 0.9,  sign:  1.0 },
        { name: "fifth",           voices: 2, spread: 3.5,    offset:  3.5,   expression: 0.9,  sign:  1.0 },
        { name: "octave",          voices: 2, spread: 6.0,    offset:  6.0,   expression: 0.8,  sign:  1.0 },
        { name: "bowed",           voices: 2, spread: 0.02,   offset:  0.0,   expression: 1.0,  sign: -1.0 },
        { name: "piano",           voices: 2, spread: 0.01,   offset:  0.0,   expression: 1.0,  sign:  0.7 },
        { name: "warbled",         voices: 2, spread: 0.25,   offset:  0.05,  expression: 0.9,  sign: -0.8 },
        { name: "hyper",           voices: 2, spread: 0.03,   offset: -0.02,  expression: 0.85, sign:  0.7 },
        { name: "peak",            voices: 2, spread: 12.038, offset:  12.01, expression: 0.85, sign:  0.9 },
        { name: "deep shift",      voices: 2, spread: 12.03,  offset: -17.01, expression: 0.85, sign:  1.2 },
        { name: "broke",           voices: 2, spread: 0.0,    offset: -0.3,   expression: 0.8,  sign:  1.0 },
        { name: "vary",            voices: 2, spread: 0.002,  offset:  0.0,   expression: 0.85, sign:  1.6 },
        { name: "energetic",       voices: 2, spread: 6.15,   offset:  6.435, expression: 0.85, sign:  0.9 },
        { name: "lone fifth",      voices: 1, spread: 0.0,    offset:  7.0,   expression: 1.4,  sign:  1.0 },
        { name: "alternate fifth", voices: 2, spread: 2.5,    offset: -2.5,   expression: 0.9,  sign:  1.0 },
        { name: "offtune",         voices: 2, spread: 0.40,   offset:  0.40,  expression: 0.9,  sign:  1.0 },
        { name: "hold",            voices: 2, spread: 0.003,  offset:  0.0,   expression: 0.8,  sign: -2.0 },
        { name: "buried",          voices: 2, spread: 0.036,  offset: -36.0,  expression: 1.4,  sign:  1.0 },
        { name: "corrupt",         voices: 2, spread: 18.0,   offset:  48.0,  expression: 0.7,  sign:  0.7 },
        { name: "weird octave",    voices: 2, spread: 5.85,   offset:  5.85,  expression: 0.75, sign:  1.0 },
        { name: "bent",            voices: 2, spread: 9.5,    offset:  4.5,   expression: 0.8,  sign: -0.6 },
        { name: "hecking gosh",    voices: 2, spread: 6.25,   offset: -6.0,   expression: 0.8,  sign: -0.7 },
        { name: "testing unison",  voices: 3, spread: 0.05,   offset:  0.0,   expression: 1.0,  sign:  1.0 },
    ]);

    public static readonly effectNames: ReadonlyArray<string> =     ["reverb", "chorus", "panning", "distortion", "bitcrusher", "note filter", "echo", "pitch shift", "detune", "vibrato", "transition type", "chord type", "wavefold", "clipper"];
    public static readonly effectOrder: ReadonlyArray<EffectType> = [EffectType.panning, EffectType.transition, EffectType.chord, EffectType.pitchShift, EffectType.detune, EffectType.vibrato, EffectType.noteFilter, EffectType.wavefold, EffectType.distortion, EffectType.clipper, EffectType.bitcrusher, EffectType.chorus, EffectType.echo, EffectType.reverb];

    public static readonly noteSizeMax:         number = 6;
    public static readonly volumeRange:         number = 50;
    public static readonly volumeLogScale:      number = 0.1428;
    public static readonly panCenter:           number = 50;
    public static readonly panMax:              number = Config.panCenter * 2;
    public static readonly panDelaySecondsMax:  number = 0.001;
    public static readonly chorusRange:         number = 8;
    public static readonly chorusPeriodSeconds: number = 2.0;
    public static readonly chorusDelayRange:    number = 0.0034;
    public static readonly chorusDelayOffsets:  ReadonlyArray<ReadonlyArray<number>> = [[1.51, 2.10, 3.35], [1.47, 2.15, 3.25]];
    public static readonly chorusPhaseOffsets:  ReadonlyArray<ReadonlyArray<number>> = [[0.0,  2.1,  4.2],  [3.2,  5.3,  1.0 ]];
    public static readonly chorusMaxDelay:      number = Config.chorusDelayRange * (1.0 + Config.chorusDelayOffsets[0].concat(Config.chorusDelayOffsets[1]).reduce((x, y) => Math.max(x, y)));
    public static readonly chords: DictionaryArray<Chord> = toNameMap([
        { name: "simultaneous",    customInterval: false, arpeggiates: false, strumParts: 0, singleTone: false },
        { name: "strum",           customInterval: false, arpeggiates: false, strumParts: 1, singleTone: false },
        { name: "arpeggio",        customInterval: false, arpeggiates: true,  strumParts: 0, singleTone: true  },
        { name: "custom interval", customInterval: true,  arpeggiates: false, strumParts: 0, singleTone: true  },
    ]);

    public static readonly maxChordSize:            number = 9;
    public static readonly operatorCount:           number = 4;
	public static readonly maxPitchOrOperatorCount: number = Math.max(Config.maxChordSize, Config.operatorCount+2);
    public static readonly algorithms: DictionaryArray<Algorithm> = toNameMap([
        { name: "1←(2 3 4)",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3, 4], [],     [],  []]},
        { name: "1←(2 3←4)",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3],    [],     [4], []]},
        { name: "1←2←(3 4)",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2],       [3, 4], [],  []]},
        { name: "1←(2 3)←4",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3],    [4],    [4], []]},
        { name: "1←2←3←4",     carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2],       [3],    [4], []]},
        { name: "1←3 2←4",     carrierCount: 2, associatedCarrier: [1, 2, 1, 2], modulatedBy: [[3],       [4],    [],  []]},
        { name: "1 2←(3 4)",   carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[],        [3, 4], [],  []]},
        { name: "1 2←3←4",     carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[],        [3],    [4], []]},
        { name: "(1 2)←3←4",   carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3],       [3],    [4], []]},
        { name: "(1 2)←(3 4)", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3, 4],    [3, 4], [],  []]},
        { name: "1 2 3←4",     carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[],        [],     [4], []]},
        { name: "(1 2 3)←4",   carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[4],       [4],    [4], []]},
        { name: "1 2 3 4",     carrierCount: 4, associatedCarrier: [1, 2, 3, 4], modulatedBy: [[],        [],     [],  []]},
        { name: "1←(2 3) 2←4", carrierCount: 2, associatedCarrier: [1, 2, 1, 2], modulatedBy: [[2, 3],    [4],    [],  []]},
        { name: "1←(2 (3 (4",  carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[2, 3, 4], [3, 4], [4], []]},
    ]);
    public static readonly algorithms6Op: DictionaryArray<Algorithm> = toNameMap([
//        Custom Placeholder
        { name: "Custom",           carrierCount: 1, associatedCarrier: [1, 1, 1, 1, 1, 1 ], modulatedBy: [[2, 3, 4, 5, 6], [],           [],        [],     [],  []]},
//        Section 1
    //    Operator Numbers:                                                                                 1                2             3          4       5   (6 will always be empty.)
        { name: "1←2←3←4←5←6",      carrierCount: 1, associatedCarrier: [1, 1, 1, 1, 1, 1 ], modulatedBy: [[2],             [3],          [4],       [5],    [6], []]},
        { name: "1←3 2←4←5←6",      carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3],             [4],          [],        [5],    [6], []]},
        { name: "1←3←4 2←5←6",      carrierCount: 2, associatedCarrier: [1, 1, 1, 2, 2, 2 ], modulatedBy: [[3],             [5],          [4],       [],     [6], []]},
        { name: "1←4 2←5 3←6",      carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3 ], modulatedBy: [[4],             [5],          [6],       [],     [],  []]},
//        Section 2
    //    Operator Numbers:                                                                                 1                2             3          4       5   (6 will always be empty.)
        { name: "1←3 2←(4 5←6)",    carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3],             [4, 5],       [],        [],     [6], []]},
        { name: "1←(3 4) 2←5←6",    carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3, 4],          [5],          [],        [],     [6], []]},
        { name: "1←3 2←(4 5 6)",    carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3],             [4, 5, 6],    [],        [],     [],  []]},
        { name: "1←3 2←(4 5)←6",    carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3],             [4, 5],       [],        [6],    [6], []]},
        { name: "1←3 2←4←(5 6)",    carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3],             [4],          [],        [5, 6], [],  []]},
        { name: "1←(2 3 4 5 6)",    carrierCount: 1, associatedCarrier: [1, 1, 1, 1, 1, 1 ], modulatedBy: [[2, 3, 4, 5, 6], [],           [],        [],     [],  []]},
        { name: "1←(2 3←5 4←6)",    carrierCount: 1, associatedCarrier: [1, 1, 1, 1, 1, 1 ], modulatedBy: [[2, 3, 4],       [],           [5],       [6],    [],  []]},
        { name: "1←(2 3 4←5←6)",    carrierCount: 1, associatedCarrier: [1, 1, 1, 1, 1, 1 ], modulatedBy: [[2, 3, 4],       [],           [],        [5],    [6], []]},
//        Section 3
    //    Operator Numbers:                                                                                 1                2             3          4       5   (6 will always be empty.)
        { name: "1←4←5 (2 3)←6",    carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3 ], modulatedBy: [[4],             [6],          [6],       [5],    [],  []]},
        { name: "1←(3 4)←5 2←6",    carrierCount: 2, associatedCarrier: [1, 2, 2, 2, 2, 2 ], modulatedBy: [[3, 4],          [6],          [5],       [5],    [],  []]},
        { name: "(1 2)←4 3←(5 6)",  carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3 ], modulatedBy: [[4],             [4],          [5, 6],    [],     [],  []]},
        { name: "(1 2)←5 (3 4)←6",  carrierCount: 4, associatedCarrier: [1, 2, 3, 4, 4, 4 ], modulatedBy: [[5],             [5],          [6],       [6],    [],  []]},
        { name: "(1 2 3)←(4 5 6)",  carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3 ], modulatedBy: [[4, 5, 6],       [4, 5, 6],    [4, 5, 6], [],     [],  []]},
        { name: "1←5 (2 3 4)←6",    carrierCount: 4, associatedCarrier: [1, 2, 3, 4, 4, 4 ], modulatedBy: [[5],             [6],          [6],       [6],    [],  []]},
        { name: "1 2←5 (3 4)←6",    carrierCount: 4, associatedCarrier: [1, 2, 3, 4, 4, 4 ], modulatedBy: [[],              [5],          [6],       [6],    [],  []]},
        { name: "1 2 (3 4 5)←6",    carrierCount: 5, associatedCarrier: [1, 2, 3, 4, 5, 5 ], modulatedBy: [[],              [],           [6],       [6],    [6], []]},
        { name: "1 2 3 (4 5)←6",    carrierCount: 5, associatedCarrier: [1, 2, 3, 4, 5, 5 ], modulatedBy: [[],              [],           [],        [6],    [6], []]},
//        Section 4
    //    Operator Numbers:                                                                                 1                2             3          4       5   (6 will always be empty.)
        { name: "1 2←4 3←(5 6)",    carrierCount: 3, associatedCarrier: [1, 2, 3, 3, 3, 3 ], modulatedBy: [[],              [4],          [5, 6],    [],     [],  []]},
        { name: "1←4 2←(5 6) 3",    carrierCount: 3, associatedCarrier: [1, 2, 3, 3, 3, 3,], modulatedBy: [[4],             [5, 6],       [],        [],     [],  []]},
        { name: "1 2 3←5 4←6",      carrierCount: 4, associatedCarrier: [1, 2, 3, 4, 4, 4 ], modulatedBy: [[],              [],           [5],       [6],    [],  []]},
        { name: "1 (2 3)←5←6 4",    carrierCount: 4, associatedCarrier: [1, 2, 3, 4, 4, 4,], modulatedBy: [[],              [5],          [5],       [],     [6], []]},
        { name: "1 2 3←5←6 4",      carrierCount: 4, associatedCarrier: [1, 2, 3, 4, 4, 4 ], modulatedBy: [[],              [],           [5, 6],    [],     [],  []]},
        { name: "(1 2 3 4 5)←6",    carrierCount: 5, associatedCarrier: [1, 2, 3, 4, 5, 5 ], modulatedBy: [[6],             [6],          [6],       [6],    [6], []]},
        { name: "1 2 3 4 5←6",      carrierCount: 5, associatedCarrier: [1, 2, 3, 4, 5, 5 ], modulatedBy: [[],              [],           [],        [],     [6], []]},
        { name: "1 2 3 4 5 6",      carrierCount: 6, associatedCarrier: [1, 2, 3, 4, 5, 6 ], modulatedBy: [[],              [],           [],        [],     [],  []]},
//        Section 5
    //    Operator Numbers:                                                                                 1                2             3          4       5   (6 will always be empty.)
        { name: "1←(2 (3 (4 (5 (6", carrierCount: 5, associatedCarrier: [1, 2, 3, 4, 5, 5 ], modulatedBy: [[2, 3, 4, 5, 6], [3, 4, 5, 6], [4, 5, 6], [5, 6], [6], []]},
        { name: "1←(2(3(4(5(6",     carrierCount: 1, associatedCarrier: [1, 1, 1, 1, 1, 1 ], modulatedBy: [[2, 3, 4, 5, 6], [3, 4, 5, 6], [4, 5, 6], [5, 6], [6], []]},
        { name: "1←4(2←5(3←6",      carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3 ], modulatedBy: [[2, 3, 4],       [3, 5],       [6],       [],     [],  []]},
        { name: "1←4(2←5 3←6",      carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3 ], modulatedBy: [[2, 3, 4],       [5],          [6],       [],     [],  []]},
    ]);

    public static readonly operatorCarrierInterval: ReadonlyArray<number> = [0.0, 0.04, -0.073, 0.091, 0.061, 0.024];
    public static readonly operatorAmplitudeMax:    number = 15;
    public static readonly operatorFrequencies: DictionaryArray<OperatorFrequency> = toNameMap([
        { name: "0.125×", mult: 0.125, hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "0.25×",  mult: 0.25,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "0.50×",  mult: 0.5,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~0.50×", mult: 0.5,   hzOffset:  2.3, amplitudeSign: -1.0 },
        { name: "0.75×",  mult: 0.75,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~0.75×", mult: 0.75,  hzOffset:  1.9, amplitudeSign: -1.0 },
        { name: "1×",     mult: 1.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~1×",    mult: 1.0,   hzOffset:  1.5, amplitudeSign: -1.0 },
        { name: "1.50×",  mult: 1.5,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "2×",     mult: 2.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~2×",    mult: 2.0,   hzOffset: -1.3, amplitudeSign: -1.0 },
        { name: "2.50×",  mult: 2.5,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "3×",     mult: 3.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "4×",     mult: 4.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~4×",    mult: 4.0,   hzOffset: -2.1, amplitudeSign: -1.0 },
        { name: "5×",     mult: 5.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "6×",     mult: 6.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "7×",     mult: 7.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "8×",     mult: 8.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~8×",    mult: 8.0,   hzOffset: -4.2, amplitudeSign: -1.0 },
        { name: "9×",     mult: 9.0,   hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "10×",    mult: 10.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "11×",    mult: 11.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "12×",    mult: 12.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "13×",    mult: 13.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "14×",    mult: 14.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "15×",    mult: 15.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "16×",    mult: 16.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~16×",   mult: 16.0,  hzOffset: -6.3, amplitudeSign: -1.0 },
        { name: "17×",    mult: 17.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "18×",    mult: 18.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "19×",    mult: 19.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "20×",    mult: 20.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "24×",    mult: 24.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "32×",    mult: 32.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "~32×",   mult: 32.0,  hzOffset: -8.4, amplitudeSign: -1.0 },
        { name: "48×",    mult: 48.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "64×",    mult: 64.0,  hzOffset:  0.0, amplitudeSign:  1.0 },
        { name: "128×",   mult: 128.0, hzOffset:  0.0, amplitudeSign:  1.0 },
    ]);

    public static readonly envelopes: DictionaryArray<Envelope> = toNameMap([
        { name: "none",           type: EnvelopeType.none,          speed:  0   },
        { name: "note size",      type: EnvelopeType.noteSize,      speed:  0   },
        { name: "pitch",          type: EnvelopeType.pitch,         speed:  0   },
        { name: "punch",          type: EnvelopeType.punch,         speed:  0   },
        { name: "flare",          type: EnvelopeType.flare,         speed:  8   },
        { name: "twang",          type: EnvelopeType.twang,         speed:  8   },
        { name: "swell",          type: EnvelopeType.swell,         speed:  8   },
        { name: "LFO",            type: EnvelopeType.LFO,           speed:  2   },
        { name: "decay",          type: EnvelopeType.decay,         speed:  2   },
        { name: "modbox trill",   type: EnvelopeType.modboxTrill,   speed:  4   },
        { name: "modbox blip",    type: EnvelopeType.modboxBlip,    speed:  4   },
        { name: "modbox click",   type: EnvelopeType.modboxClick,   speed:  5   },
        { name: "modbox bow",     type: EnvelopeType.modboxBow,     speed:  90  },
        { name: "dogebox2 clap",  type: EnvelopeType.dogebox2Clap,  speed:  64  },
        { name: "wibble",         type: EnvelopeType.wibble,        speed:  12  },
        { name: "linear",         type: EnvelopeType.linear,        speed:  32  },
        { name: "rise",           type: EnvelopeType.rise,          speed:  32  },
        { name: "jummbox blip",   type: EnvelopeType.jummboxBlip,   speed:  8   },
        { name: "custom",         type: EnvelopeType.custom,        speed:  1   },
    ]);
    public static readonly drumsetEnvelopes: DictionaryArray<DrumsetEnvelope> = toNameMap([
        { name: "none",           type: EnvelopeType.none,          speed:  0   },
        { name: "note size",      type: EnvelopeType.noteSize,      speed:  0   },
        { name: "punch",          type: EnvelopeType.punch,         speed:  0   },
        { name: "flare",          type: EnvelopeType.flare,         speed:  8   },
        { name: "twang",          type: EnvelopeType.twang,         speed:  8   },
        { name: "swell",          type: EnvelopeType.swell,         speed:  8   },
        { name: "LFO",            type: EnvelopeType.LFO,           speed:  2   },
        { name: "decay",          type: EnvelopeType.decay,         speed:  2   },
        { name: "modbox trill",   type: EnvelopeType.modboxTrill,   speed:  4   },
        { name: "modbox blip",    type: EnvelopeType.modboxBlip,    speed:  4   },
        { name: "modbox click",   type: EnvelopeType.modboxClick,   speed:  5   },
        { name: "modbox bow",     type: EnvelopeType.modboxBow,     speed:  90  },
        { name: "dogebox2 clap",  type: EnvelopeType.dogebox2Clap,  speed:  64  },
        { name: "wibble",         type: EnvelopeType.wibble,        speed:  12  },
        { name: "linear",         type: EnvelopeType.linear,        speed:  32  },
        { name: "rise",           type: EnvelopeType.rise,          speed:  32  },
        { name: "jummbox blip",   type: EnvelopeType.jummboxBlip,   speed:  8   },
        { name: "custom",         type: EnvelopeType.custom,        speed:  1   },
    ]);

    public static readonly perEnvelopeSpeedMin:        number = 0;
    public static readonly perEnvelopeSpeedMax:        number = 16;
    public static readonly lowerBoundMin:              number = 0;
    public static readonly lowerBoundMax:              number = 8;
    public static readonly upperBoundMin:              number = 0;
    public static readonly upperBoundMax:              number = 8;
    public static readonly envelopeDelayMax:           number = 32;
    public static readonly envelopePhaseMax:           number = 16;
    public static readonly clapMirrorsMax:             number = 32;
    public static readonly LFOAccelerationMin:         number = 0.25;
    public static readonly LFOAccelerationMax:         number = 4;
    public static readonly LFOPulseWidthDefault:       number = 4;
    public static readonly LFOTrapezoidRatioMin:       number = 0.5;
    public static readonly LFOTrapezoidRatioMax:       number = 4;
    public static readonly LFOStairsStepAmountMax:     number = 32;
    public static readonly customEnvGridMinWidth:      number = 4;
    public static readonly customEnvGridMaxWidth:      number = 32;
    public static readonly customEnvGridDefaultWidth:  number = 12;
    public static readonly customEnvGridMinHeight:     number = 2;
    public static readonly customEnvGridMaxHeight:     number = 12;
    public static readonly customEnvGridDefaultHeight: number = 6;
    public static readonly gridPointDefaultConnection: number = 0;
    public static readonly gridPointDurationMin:       number = 0.01;
    public static readonly gridPointDurationMax:       number = 16;
    public static readonly gridPointDefaultDuration:   number = 1;

    public static readonly feedbacks: DictionaryArray<Feedback> = toNameMap([
        { name: "1⟲",         indices: [[1], [],  [],  [] ]},
        { name: "2⟲",         indices: [[],  [2], [],  [] ]},
        { name: "3⟲",         indices: [[],  [],  [3], [] ]},
        { name: "4⟲",         indices: [[],  [],  [],  [4]]},
        { name: "1⟲ 2⟲",     indices: [[1], [2], [],  [] ]},
        { name: "1⟲ 3⟲",     indices: [[1], [],  [3], [] ]},
        { name: "1⟲ 4⟲",     indices: [[1], [],  [],  [4]]},
        { name: "2⟲ 3⟲",     indices: [[],  [2], [3], [] ]},
        { name: "2⟲ 4⟲",     indices: [[],  [2], [],  [4]]},
        { name: "3⟲ 4⟲",     indices: [[],  [],  [3], [4]]},
        { name: "1⟲ 2⟲ 3⟲", indices: [[1], [2], [3], [] ]},
        { name: "2⟲ 3⟲ 4⟲", indices: [[],  [2], [3], [4]]},
        { name: "1⟲ 3⟲ 4⟲", indices: [[1], [],  [3], [4]]},
        { name: "1⟲ 2⟲ 4⟲", indices: [[1], [2], [],  [4]]},
        { name: "⟲ALL",      indices: [[1], [2], [3], [4]]},
        { name: "1→2",        indices: [[],  [1], [],  [] ]},
        { name: "1→3",        indices: [[],  [],  [1], [] ]},
        { name: "1→4",        indices: [[],  [],  [],  [1]]},
        { name: "2→3",        indices: [[],  [],  [2], [] ]},
        { name: "2→4",        indices: [[],  [],  [],  [2]]},
        { name: "3→4",        indices: [[],  [],  [],  [3]]},
        { name: "1→3 2→4",    indices: [[],  [],  [1], [2]]},
        { name: "1→4 2→3",    indices: [[],  [],  [2], [1]]},
        { name: "1→2 3→4",    indices: [[],  [1], [],  [3]]},
        { name: "1→2→3→4",    indices: [[],  [1], [2], [3]]},
        { name: "1↔2 3↔4",    indices: [[2], [1], [4], [3]]},
        { name: "1↔4 2↔3",    indices: [[4], [3], [2], [1]]},
        { name: "2→1→4→3→2",  indices: [[2], [3], [4], [1]]},
        { name: "1→2→3→4→1",  indices: [[4], [1], [2], [3]]},
        { name: "(1 2 3)→4",  indices: [[],  [],  [],  [1, 2, 3]]},
        { name: "ALL",        indices: [[1,2,3,4], [1,2,3,4], [1,2,3,4], [1,2,3,4]]},
    ]);
    public static readonly feedbacks6Op: DictionaryArray<Feedback> = toNameMap([
//        Custom Placeholder
        { name: "Custom",                 indices: [[2, 3, 4, 5, 6], [], [], [], [], []]},

        { name: "1⟲",                    indices: [[1], [],  [],  [],  [],  [] ]},
        { name: "2⟲",                    indices: [[],  [2], [],  [],  [],  [] ]},
        { name: "3⟲",                    indices: [[],  [],  [3], [],  [],  [] ]},
        { name: "4⟲",                    indices: [[],  [],  [],  [4], [],  [] ]},
        { name: "5⟲",                    indices: [[],  [],  [],  [],  [5], [] ]},
        { name: "6⟲",                    indices: [[],  [],  [],  [],  [],  [6]]},
        { name: "1⟲ 2⟲",                 indices: [[1], [2], [],  [],  [],  [] ]},
        { name: "3⟲ 4⟲",                 indices: [[],  [],  [3], [4], [],  [] ]},
        { name: "1⟲ 2⟲ 3⟲",             indices: [[1], [2], [3], [],  [],  [] ]},
        { name: "2⟲ 3⟲ 4⟲",             indices: [[],  [2], [3], [4], [],  [] ]},
        { name: "1⟲ 2⟲ 3⟲ 4⟲",         indices: [[1], [2], [3], [4], [],  [] ]},
        { name: "1⟲ 2⟲ 3⟲ 4⟲ 5⟲",     indices: [[1], [2], [3], [4], [5], [] ]},
        { name: "⟲ALL",                  indices: [[1], [2], [3], [4], [5], [6]]},
        { name: "1→2",                    indices: [[],  [1], [],  [],  [],  [] ]},
        { name: "1→3",                    indices: [[],  [],  [1], [],  [],  [] ]},
        { name: "1→4",                    indices: [[],  [],  [],  [1], [],  [] ]},
        { name: "1→5",                    indices: [[],  [],  [],  [],  [1], [] ]},
        { name: "1→6",                    indices: [[],  [],  [],  [],  [],  [1]]},
        { name: "2→3",                    indices: [[],  [],  [2], [],  [],  [] ]},
        { name: "2→4",                    indices: [[],  [],  [],  [2], [],  [] ]},
        { name: "3→4",                    indices: [[],  [],  [],  [3], [],  [] ]},
        { name: "4→5",                    indices: [[],  [],  [],  [],  [4], [] ]},
        { name: "1→4 2→5 3→6",            indices: [[],  [],  [],  [1], [2], [3]]},
        { name: "1→5 2→6 3→4",            indices: [[],  [],  [],  [3], [1], [2]]},
        { name: "1→2→3→4→5→6",            indices: [[],  [1], [2], [3], [4], [5]]},
        { name: "2→1→6→5→4→3→2",          indices: [[2], [3], [4], [5], [6], [1]]},
        { name: "1→2→3→4→5→6→1",          indices: [[6], [1], [2], [3], [4], [5]]},
        { name: "1↔2 3↔4 5↔6",            indices: [[2], [1], [4], [3], [6], [5]]},
        { name: "1↔4 2↔5 3↔6",            indices: [[4], [5], [6], [1], [2], [3]]},
        { name: "(1,2,3,4,5)→6",          indices: [[],  [],  [],  [],  [],  [1, 2, 3, 4, 5]]},
        { name: "ALL",                    indices: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]]},
    ]);

    public static readonly chipNoiseLength:                  number = 1 << 15; 
    public static readonly spectrumNoiseLength:              number = 1 << 15; 
    public static readonly spectrumBasePitch:                number = 24;
    public static readonly spectrumControlPoints:            number = 30;
    public static readonly spectrumControlPointsPerOctave:   number = 7;
    public static readonly spectrumControlPointBits:         number = 3;
    public static readonly spectrumMax:                      number = (1 << Config.spectrumControlPointBits) - 1;
    public static readonly harmonicsControlPoints:           number = 28;
    public static readonly harmonicsRendered:                number = 64;
    public static readonly harmonicsRenderedForPickedString: number = 1 << 8; 
    public static readonly harmonicsControlPointBits:        number = 3;
    public static readonly harmonicsMax:                     number = (1 << Config.harmonicsControlPointBits) - 1;
    public static readonly harmonicsWavelength:              number = 1 << 11; 
    public static readonly pulseWidthRange:                  number = 50;
    public static readonly pulseWidthStepPower:              number = 0.50;
    public static readonly supersawVoiceCount:               number = 7;
	public static readonly supersawDynamismMax:              number = 6;
	public static readonly supersawSpreadMax:                number = 12;
	public static readonly supersawShapeMax:                 number = 6;
    public static readonly wavetableSpeedMax:                number = 24;
    public static readonly pitchChannelCountMin:             number = 1;
    public static readonly pitchChannelCountMax:             number = 40;
    public static readonly noiseChannelCountMin:             number = 0;
    public static readonly noiseChannelCountMax:             number = 16;
    public static readonly modChannelCountMin:               number = 0;
    public static readonly modChannelCountMax:               number = 12;
    public static readonly noiseInterval:                    number = 6;
    public static readonly pitchesPerOctave:                 number = 12;
    public static readonly drumCount:                        number = 12;
    public static readonly pitchOctaves:                     number = 8;
    public static readonly modCount:                         number = 6;
    public static readonly maxPitch:                         number = Config.pitchOctaves * Config.pitchesPerOctave;
    public static readonly maximumTonesPerChannel:           number = Config.maxChordSize * 2;
    public static readonly justIntonationSemitones:          number[] = [1.0 / 2.0, 8.0 / 15.0, 9.0 / 16.0, 3.0 / 5.0, 5.0 / 8.0, 2.0 / 3.0, 32.0 / 45.0, 3.0 / 4.0, 4.0 / 5.0, 5.0 / 6.0, 8.0 / 9.0, 15.0 / 16.0, 1.0, 16.0 / 15.0, 9.0 / 8.0, 6.0 / 5.0, 5.0 / 4.0, 4.0 / 3.0, 45.0 / 32.0, 3.0 / 2.0, 8.0 / 5.0, 5.0 / 3.0, 16.0 / 9.0, 15.0 / 8.0, 2.0].map(x => Math.log2(x) * Config.pitchesPerOctave);
    public static readonly pitchShiftRange:                  number = Config.justIntonationSemitones.length;
    public static readonly pitchShiftCenter:                 number = Config.pitchShiftRange >> 1;
    public static readonly detuneCenter:                     number = 600;
    public static readonly detuneMax:                        number = 1200;
    public static readonly detuneMin:                        number = 0;
    public static readonly songDetuneMin:                    number = 0;
    public static readonly songDetuneMax:                    number = 500;
    public static readonly unisonVoicesMin:                  number = 1;
    public static readonly unisonVoicesMax:                  number = 2;
    public static readonly unisonSpreadMin:                  number = -96;
    public static readonly unisonSpreadMax:                  number = 96; 
    public static readonly unisonOffsetMin:                  number = -96;
    public static readonly unisonOffsetMax:                  number = 96; 
    public static readonly unisonExpressionMin:              number = -2;
    public static readonly unisonExpressionMax:              number = 2; 
    public static readonly unisonSignMin:                    number = -2;
    public static readonly unisonSignMax:                    number = 2; 
    public static readonly sineWaveLength:                   number = 1 << 8;
    public static readonly sineWaveMask:                     number = Config.sineWaveLength - 1;
    public static readonly sineWave:                         Float32Array = generateSineWave();
//  Picked strings have an all-pass filter with a corner frequency based on the tone fundamental frequency, in order to add a slight inharmonicity. (Which is important for distortion.)
    public static readonly pickedStringDispersionCenterFreq: number = 6000.0; // The tone fundamental freq is pulled toward this freq for computing the all-pass corner freq.
    public static readonly pickedStringDispersionFreqScale:  number = 0.3;    // The tone fundamental freq freq moves this much toward the center freq for computing the all-pass corner freq.
    public static readonly pickedStringDispersionFreqMult:   number = 4.0;    // The all-pass corner freq is based on this times the adjusted tone fundamental freq.
    public static readonly pickedStringShelfHz:              number = 4000.0; // The cutoff freq of the shelf filter that is used to decay the high frequency energy in the picked string.
    public static readonly distortionRange:                  number = 16;
    public static readonly clipMax:                          number = 24;
    public static readonly wavefoldMax:                      number = 40;
    public static readonly stringSustainRange:               number = 15;
    public static readonly stringDecayRate:                  number = 0.12;
    public static readonly enableAcousticSustain:            boolean = true;
	public static readonly sustainTypeNames:                 ReadonlyArray<string> = ["bright", "acoustic"];
    public static readonly bitcrusherFreqRange:              number = 14;
    public static readonly bitcrusherOctaveStep:             number = 0.5;
    public static readonly bitcrusherQuantizationRange:      number = 8;
    public static readonly maxEnvelopeCount:                 number = 18;
    public static readonly defaultAutomationRange:           number = 13;
    public static readonly maxAmountOfRandomSeeds:           number = 32;
    public static readonly instrumentAutomationTargets: DictionaryArray<AutomationTarget> = toNameMap([
        { name: "none",                   computeIndex: null,                                        displayName: "none",              interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: null },
        { name: "noteVolume",             computeIndex: EnvelopeComputeIndex.noteVolume,             displayName: "note volume",       interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: null },
        { name: "pulseWidth",             computeIndex: EnvelopeComputeIndex.pulseWidth,             displayName: "pulse width",       interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.pwm, InstrumentType.supersaw] },
        { name: "stringSustain",          computeIndex: EnvelopeComputeIndex.stringSustain,          displayName: "sustain",           interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.pickedString] },
        { name: "unison",                 computeIndex: EnvelopeComputeIndex.unison,                 displayName: "unison",            interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.chip, InstrumentType.harmonics, InstrumentType.pickedString, InstrumentType.customChipWave, InstrumentType.spectrum, InstrumentType.pwm, InstrumentType.wavetable, InstrumentType.noise] },
        { name: "operatorFrequency",      computeIndex: EnvelopeComputeIndex.operatorFrequency0,     displayName: "fm# freq",          interleave: true,  isFilter: false, maxCount: Config.operatorCount+2,  effect: null,                  compatibleInstruments: [InstrumentType.fm, InstrumentType.advfm] },
        { name: "operatorAmplitude",      computeIndex: EnvelopeComputeIndex.operatorAmplitude0,     displayName: "fm# volume",        interleave: false, isFilter: false, maxCount: Config.operatorCount+2,  effect: null,                  compatibleInstruments: [InstrumentType.fm, InstrumentType.advfm] },
        { name: "feedbackAmplitude",      computeIndex: EnvelopeComputeIndex.feedbackAmplitude,      displayName: "fm feedback",       interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.fm, InstrumentType.advfm] },
        { name: "pitchShift",             computeIndex: EnvelopeComputeIndex.pitchShift,             displayName: "pitch shift",       interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.pitchShift, compatibleInstruments: null },
        { name: "detune",                 computeIndex: EnvelopeComputeIndex.detune,                 displayName: "detune",            interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.detune,     compatibleInstruments: null },
        { name: "vibratoDepth",           computeIndex: EnvelopeComputeIndex.vibratoDepth,           displayName: "vibrato range",     interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.vibrato,    compatibleInstruments: null },
        { name: "noteFilterAllFreqs",     computeIndex: EnvelopeComputeIndex.noteFilterAllFreqs,     displayName: "n. filter freqs",   interleave: false, isFilter: true,  maxCount: 1,                       effect: EffectType.noteFilter, compatibleInstruments: null },
        { name: "noteFilterFreq",         computeIndex: EnvelopeComputeIndex.noteFilterFreq0,        displayName: "n. filter # freq",  interleave: false, isFilter: true,  maxCount: Config.filterMaxPoints,  effect: EffectType.noteFilter, compatibleInstruments: null },
        { name: "supersawDynamism",       computeIndex: EnvelopeComputeIndex.supersawDynamism,       displayName: "dynamism",          interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.supersaw] },
		{ name: "supersawSpread",         computeIndex: EnvelopeComputeIndex.supersawSpread,         displayName: "spread",            interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.supersaw] },
		{ name: "supersawShape",          computeIndex: EnvelopeComputeIndex.supersawShape,          displayName: "saw↔pulse",         interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: [InstrumentType.supersaw] },
        { name: "operatorPulseWidth",     computeIndex: EnvelopeComputeIndex.operatorPulseWidth0,    displayName: "fm # pwm",          interleave: false, isFilter: false, maxCount: Config.operatorCount+2,  effect: null,                  compatibleInstruments: [InstrumentType.fm, InstrumentType.advfm] },
        { name: "distortion",             computeIndex: EnvelopeComputeIndex.distortion,             displayName: "distortion",        interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.distortion, compatibleInstruments: null },
        { name: "bitCrusher",             computeIndex: EnvelopeComputeIndex.bitCrusher,             displayName: "bit crush",         interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.bitcrusher, compatibleInstruments: null },
        { name: "freqCrusher",            computeIndex: EnvelopeComputeIndex.freqCrusher,            displayName: "freq crush",        interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.bitcrusher, compatibleInstruments: null },
        { name: "chorus",                 computeIndex: EnvelopeComputeIndex.chorus,                 displayName: "chorus",            interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.chorus,     compatibleInstruments: null },
        { name: "reverb",                 computeIndex: EnvelopeComputeIndex.reverb,                 displayName: "reverb",            interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.reverb,     compatibleInstruments: null },
        { name: "clipBounds",             computeIndex: EnvelopeComputeIndex.clipBounds,             displayName: "clipping",          interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.clipper,    compatibleInstruments: null },
        { name: "wavefoldBounds",         computeIndex: EnvelopeComputeIndex.wavefoldBounds,         displayName: "wavefold",          interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.wavefold,   compatibleInstruments: null },
/*      { name: "noteFilterGain",         computeIndex: EnvelopeComputeIndex.noteFilterGain0,        displayName: "n. filter # vol",   interleave: false, isFilter: true,  maxCount: Config.filterMaxPoints,  effect: EffectType.noteFilter, compatibleInstruments: null },
        { name: "eqFilterAllFreqs",       computeIndex: EnvelopeComputeIndex.eqFilterAllFreqs,       displayName: "eq filter freqs",   interleave: false, isFilter: true,  maxCount: 1,                       effect: null,                  compatibleInstruments: null },
        { name: "eqFilterFreq",           computeIndex: EnvelopeComputeIndex.eqFilterFreq0,          displayName: "eq filter # freq",  interleave: true,  isFilter: true,  maxCount: Config.filterMaxPoints,  effect: null,                  compatibleInstruments: null },
        { name: "eqFilterGain",           computeIndex: EnvelopeComputeIndex.eqFilterGain0,          displayName: "eq filter # vol",   interleave: false, isFilter: true,  maxCount: Config.filterMaxPoints,  effect: null,                  compatibleInstruments: null },
        { name: "panning",                computeIndex: EnvelopeComputeIndex.panning,                displayName: "panning",           interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.panning,    compatibleInstruments: null },
        { name: "echoSustain",            computeIndex: EnvelopeComputeIndex.echoSustain,            displayName: "echo",              interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.echo,       compatibleInstruments: null },
        { name: "echoDelay",              computeIndex: EnvelopeComputeIndex.echoDelay,              displayName: "echo delay",        interleave: false, isFilter: false, maxCount: 1,                       effect: EffectType.echo,       compatibleInstruments: null }, 
        { name: "mixVolume",              computeIndex: EnvelopeComputeIndex.mixVolume,              displayName: "mix volume",        interleave: false, isFilter: false, maxCount: 1,                       effect: null,                  compatibleInstruments: null },
        { name: "envelope#",              computeIndex: null,                                        displayName: "envelope",          interleave: false, isFilter: false, maxCount: Config.maxEnvelopeCount, effect: null,                  compatibleInstruments: null }, */
    ]);

    public static readonly operatorWaves: DictionaryArray<OperatorWave> = toNameMap([
        { name: "sine",              samples: Config.sineWave           },
        { name: "triangle",          samples: generateTriWave()         },
        { name: "sawtooth",          samples: generateSawWave()         },
        { name: "pulse width",       samples: generateSquareWave()      },
        { name: "ramp",              samples: generateSawWave(true)     },
        { name: "trapezoid",         samples: generateTrapezoidWave(2)  },
        { name: "clang",             samples: generateClangNoise()      },
        { name: "metallic",          samples: generateMetallicNoise()   },
        { name: "quasi-sine",        samples: generateQuasiSineWave()   },
        { name: "secant",            samples: generateSecantWave()      },
        { name: "absine",            samples: generateAbsineWave()      },
        { name: "semisine",          samples: generateSemiSineWave()    },
        { name: "camelsine",         samples: generateCamelsineWave()   },
        { name: "pulsine",           samples: generatePulsineWave()     },
        { name: "sharksine",         samples: generateSharkSineWave()   },
        { name: "logarithmic saw",   samples: generateLogSawWave()      },
        { name: "white noise",       samples: generateWhiteNoise()      },
    ]);

    // Kept for compatibility.
    public static readonly pwmOperatorWaves: DictionaryArray<OperatorWave> = toNameMap([
        { name: "1%",     samples: generateSquareWave(0.01)   },
        { name: "2.5%",   samples: generateSquareWave(0.025)  },
        { name: "5%",     samples: generateSquareWave(0.05)   },
        { name: "6.25%",  samples: generateSquareWave(0.0625) },
        { name: "10%",    samples: generateSquareWave(0.10)   },
        { name: "12.5%",  samples: generateSquareWave(0.125)  },
        { name: "15%",    samples: generateSquareWave(0.15)   },
        { name: "17.5%",  samples: generateSquareWave(0.175)  },
        { name: "20%",    samples: generateSquareWave(0.20)   },
        { name: "25%",    samples: generateSquareWave(0.25)   },
        { name: "30%",    samples: generateSquareWave(0.30)   },
        { name: "33%",    samples: generateSquareWave(1 / 3)  },
        { name: "40%",    samples: generateSquareWave(0.40)   },
        { name: "45%",    samples: generateSquareWave(0.45)   },
        { name: "50%",    samples: generateSquareWave(0.5)    },
        { name: "55%",    samples: generateSquareWave(0.55)   },
        { name: "60%",    samples: generateSquareWave(0.60)   },
        { name: "66%",    samples: generateSquareWave(2 / 3)  },
        { name: "70%",    samples: generateSquareWave(0.70)   },
        { name: "75%",    samples: generateSquareWave(0.75)   },
        { name: "80%",    samples: generateSquareWave(0.80)   },
        { name: "82.5%",  samples: generateSquareWave(0.825)  },
        { name: "85%",    samples: generateSquareWave(0.85)   },
        { name: "87.5%",  samples: generateSquareWave(0.875)  },
        { name: "90%",    samples: generateSquareWave(0.90)   },
        { name: "93.75%", samples: generateSquareWave(0.9375) },
        { name: "95%",    samples: generateSquareWave(0.95)   },
        { name: "97.5%",  samples: generateSquareWave(0.975)  },
        { name: "99%",    samples: generateSquareWave(0.99)   },
    ]);

//  Height of the small editor column for inserting/deleting rows, in pixels.
    public static readonly barEditorHeight: number = 10;

//  Careful about changing index ordering for this. Index is stored in URL/JSON etc.
    public static readonly modulators: DictionaryArray<Modulator> = toNameMap([
        { name: "none",            pianoName: "None",                   maxRawVol: 6,                                                      newNoteVol: 6,                                                            forSong: true,    convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "No Mod Setting",               promptDesc: [ "No setting has been chosen yet, so this modulator will have no effect. Try choosing a setting with the dropdown, then click this '?' again for more info.", "[$LO - $HI]" ] },

        { name: "song volume",     pianoName: "Volume",                 maxRawVol: 100,                                                    newNoteVol: 100,                                                          forSong: true,    convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Song Volume",                  promptDesc: ["This setting affects the overall volume of the song, just like the main volume slider.", "At $HI, the volume will be unchanged from default, and it will get gradually quieter down to $LO.", "[MULTIPLICATIVE] [$LO - $HI] [%]" ] },

        { name: "tempo",           pianoName: "Tempo",                  maxRawVol: Config.tempoMax - Config.tempoMin,                      newNoteVol: Math.ceil((Config.tempoMax - Config.tempoMin) / 2),           forSong: true,    convertRealFactor: Config.tempoMin,                      associatedEffect: EffectType.length,
            promptName: "Song Tempo",                   promptDesc: ["This setting controls the speed your song plays at, just like the tempo slider.", "When you first make a note for this setting, it will default to your current tempo. Raising it speeds up the song, up to $HI BPM, and lowering it slows it down, to a minimum of $LO BPM.", "Note that you can make a 'swing' effect by rapidly changing between two tempo values.", "[OVERWRITING] [$LO - $HI] [BPM]" ] },

        { name: "song reverb",     pianoName: "Reverb",                 maxRawVol: Config.reverbRange * 2,                                 newNoteVol: Config.reverbRange,                                           forSong: true,    convertRealFactor: -Config.reverbRange,                  associatedEffect: EffectType.length,
            promptName: "Song Reverb",                  promptDesc: ["This setting affects the overall reverb of your song. It works by multiplying existing reverb for instruments, so those with no reverb set will be unaffected.", "At $MID, all instruments' reverb will be unchanged from default. This increases up to double the reverb value at $HI, or down to no reverb at $LO.", "[MULTIPLICATIVE] [$LO - $HI]" ] },

        { name: "next bar",        pianoName: "Next Bar",               maxRawVol: 1,                                                      newNoteVol: 1,                                                            forSong: true,    convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Go To Next Bar",               promptDesc: ["This setting functions a little different from most. Wherever a note is placed, the song will jump immediately to the next bar when it is encountered.", "This jump happens at the very start of the note, so the length of a next-bar note is irrelevant. Also, the note can be value 0 or 1, but the value is also irrelevant - wherever you place a note, the song will jump.", "You can make mixed-meter songs or intro sections by cutting off unneeded beats with a next-bar modulator.", "[$LO - $HI]" ] },

        { name: "note volume",     pianoName: "Note Vol.",              maxRawVol: Config.volumeRange,                                     newNoteVol: Math.ceil(Config.volumeRange / 2),                            forSong: false,   convertRealFactor: Math.ceil(-Config.volumeRange / 2.0), associatedEffect: EffectType.length,
            promptName: "Note Volume",                  promptDesc: ["This setting affects the volume of your instrument as if its note size had been scaled.", "At $MID, an instrument's volume will be unchanged from default. This means you can still use the volume sliders to mix the base volume of instruments. The volume gradually increases up to $HI, or decreases down to mute at $LO.", "This setting was the default for volume modulation in JummBox for a long time. Due to some new effects like distortion and bitcrush, note volume doesn't always allow fine volume control. Also, this modulator affects the value of FM modulator waves instead of just carriers. This can distort the sound which may be useful, but also may be undesirable. In those cases, use the 'mix volume' modulator instead, which will always just scale the volume with no added effects.", "For display purposes, this mod will show up on the instrument volume slider, as long as there is not also an active 'mix volume' modulator anyhow. However, as mentioned, it works more like changing note volume.", "[MULTIPLICATIVE] [$LO - $HI]" ] },

        { name: "pan",             pianoName: "Pan",                    maxRawVol: Config.panMax,                                          newNoteVol: Math.ceil(Config.panMax / 2),                                 forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.panning,
            promptName: "Instrument Panning",           promptDesc: ["This setting controls the panning of your instrument, just like the panning slider.", "At $LO, your instrument will sound like it is coming fully from the left-ear side. At $MID it will be right in the middle, and at $HI, it will sound like it's on the right.", "[OVERWRITING] [$LO - $HI] [L-R]" ] },

        { name: "reverb",          pianoName: "Reverb",                 maxRawVol: Config.reverbRange,                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.reverb,
            promptName: "Instrument Reverb",            promptDesc: ["This setting controls the reverb of your insturment, just like the reverb slider.", "At $LO, your instrument will have no reverb. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "distortion",      pianoName: "Distortion",             maxRawVol: Config.distortionRange-1,                               newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.distortion,
            promptName: "Instrument Distortion",        promptDesc: ["This setting controls the amount of distortion for your instrument, just like the distortion slider.", "At $LO, your instrument will have no distortion. At $HI, it will be at maximum.", "[OVERWRITING] [$LO - $HI]" ] },

        { name: "fm slider 1",     pianoName: "FM 1",                   maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Slider 1",                  promptDesc: [ "This setting affects the strength of the first FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"] },

        { name: "fm slider 2",     pianoName: "FM 2",                   maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Slider 2",                  promptDesc: ["This setting affects the strength of the second FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]" ] },

        { name: "fm slider 3",     pianoName: "FM 3",                   maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Slider 3",                  promptDesc: ["This setting affects the strength of the third FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]" ] },

        { name: "fm slider 4",     pianoName: "FM 4",                   maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Slider 4",                  promptDesc: ["This setting affects the strength of the fourth FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"] },

        { name: "fm feedback",     pianoName: "FM Feedback",            maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Feedback",                  promptDesc: ["This setting affects the strength of the FM feedback slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"] },

        { name: "pulse width",     pianoName: "Pulse Width",            maxRawVol: Config.pulseWidthRange,                                 newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Pulse Width",                  promptDesc: ["This setting controls the width of this instrument's pulse wave, just like the pulse width slider.", "At $HI, your instrument will sound like a pure square wave (on 50% of the time). It will gradually sound narrower down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "detune",          pianoName: "Detune",                 maxRawVol: Config.detuneMax - Config.detuneMin,                    newNoteVol: Config.detuneCenter,                                          forSong: false,   convertRealFactor: -Config.detuneCenter,                 associatedEffect: EffectType.detune,
            promptName: "Instrument Detune",            promptDesc: ["This setting controls the detune for this instrument, just like the detune slider.", "At $MID, your instrument will have no detune applied. Each tick corresponds to one cent, or one-hundredth of a pitch. Thus, each change of 100 ticks corresponds to one half-step of detune, up to six half-steps up at $HI, or six half-steps down at $LO.", "[OVERWRITING] [$LO - $HI] [cents]"] },

        { name: "vibrato depth",   pianoName: "Vibrato Depth",          maxRawVol: 50,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.vibrato,
            promptName: "Vibrato Depth",                promptDesc: ["This setting controls the amount that your pitch moves up and down by during vibrato, just like the vibrato depth slider.", "At $LO, your instrument will have no vibrato depth so its vibrato would be inaudible. This increases up to $HI, where an extreme pitch change will be noticeable.", "[OVERWRITING] [$LO - $HI] [pitch ÷25]"] },

        { name: "song detune",     pianoName: "Detune",                 maxRawVol: Config.songDetuneMax - Config.songDetuneMin,            newNoteVol: Math.ceil((Config.songDetuneMax - Config.songDetuneMin) / 2), forSong: true,    convertRealFactor: -250,                                 associatedEffect: EffectType.length,
            promptName: "Song Detune",                  promptDesc: ["This setting controls the overall detune of the entire song. There is no associated slider.", "At $MID, your song will have no extra detune applied and sound unchanged from default. Each tick corresponds to four cents, or four hundredths of a pitch. Thus, each change of 25 ticks corresponds to one half-step of detune, up to 10 half-steps up at $HI, or 10 half-steps down at $LO.", "[MULTIPLICATIVE] [$LO - $HI] [cents x4]"] },

        { name: "vibrato speed",   pianoName: "Vibrato Speed",          maxRawVol: 30,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.vibrato,
            promptName: "Vibrato Speed",                promptDesc: ["This setting controls the speed your instrument will vibrato at, just like the slider.", "A setting of $LO means there will be no oscillation, and vibrato will be disabled. Higher settings will increase the speed, up to a dramatic trill at the max value, $HI.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "vibrato delay",   pianoName: "Vibrato Delay",          maxRawVol: 50,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.vibrato,
            promptName: "Vibrato Delay",                promptDesc: ["This setting controls the amount of time vibrato will be held off for before triggering for every new note, just like the slider.", "A setting of $LO means there will be no delay. A setting of 24 corresponds to one full beat of delay. As a sole exception to this scale, setting delay to $HI will completely disable vibrato (as if it had infinite delay).", "[OVERWRITING] [$LO - $HI] [beats ÷24]"] },

        { name: "arp speed",       pianoName: "Arp Speed",              maxRawVol: 50,                                                     newNoteVol: 12,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.chord,
            promptName: "Arpeggio Speed",               promptDesc: ["This setting controls the speed at which your instrument's chords arpeggiate, just like the arpeggio speed slider.", "Each setting corresponds to a different speed, from the slowest to the fastest. The speeds are listed below.", "[0-4]: x0, x1/16, x⅛, x⅕, x¼,", "[5-9]: x⅓, x⅖, x½, x⅔, x¾,", "[10-14]: x⅘, x0.9, x1, x1.1, x1.2,", "[15-19]: x1.3, x1.4, x1.5, x1.6, x1.7,", "[20-24]: x1.8, x1.9, x2, x2.1, x2.2,", "[25-29]: x2.3, x2.4, x2.5, x2.6, x2.7,", "[30-34]: x2.8, x2.9, x3, x3.1, x3.2,", "[35-39]: x3.3, x3.4, x3.5, x3.6, x3.7," ,"[40-44]: x3.8, x3.9, x4, x4.15, x4.3,", "[45-50]: x4.5, x4.8, x5, x5.5, x6, x8", "[OVERWRITING] [$LO - $HI]"] },

        { name: "pan delay",       pianoName: "Pan Delay",              maxRawVol: 20,                                                     newNoteVol: 10,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.panning,
            promptName: "Panning Delay",                promptDesc: ["This setting controls the delay applied to panning for your instrument, just like the pan delay slider.", "With more delay, the panning effect will generally be more pronounced. $MID is the default value, whereas $LO will remove any delay at all. No delay can be desirable for chiptune songs.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "reset arp",       pianoName: "Reset Arp",              maxRawVol: 1,                                                      newNoteVol: 1,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.chord,
            promptName: "Reset Arpeggio",               promptDesc: ["This setting functions a little different from most. Wherever a note is placed, the arpeggio of this instrument will reset at the very start of that note. This is most noticeable with lower arpeggio speeds. The lengths and values of notes for this setting don't matter, just the note start times.", "This mod can be used to sync up your apreggios so that they always sound the same, even if you are using an odd-ratio arpeggio speed or modulating arpeggio speed.", "[$LO - $HI]"] },

        { name: "eq filter",       pianoName: "EQFlt",                  maxRawVol: 10,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "EQ Filter",                    promptDesc: ["This setting controls a few separate things for your instrument's EQ filter.", "When the option 'morph' is selected, your modulator values will indicate a sub-filter index of your EQ filter to 'morph' to over time. For example, a change from 0 to 1 means your main filter (default) will morph to sub-filter 1 over the specified duration. You can shape the main filter and sub-filters in the large filter editor ('+' button). If your two filters' number, type, and order of filter dots all match up, the morph will happen smoothly and you'll be able to hear them changing. If they do not match up, the filters will simply jump between each other.", "Note that filters will morph based on endpoints in the pattern editor. So, if you specify a morph from sub-filter 1 to 4 but do not specifically drag in new endpoints for 2 and 3, it will morph directly between 1 and 4 without going through the others.", "If you target Dot X or Dot Y, you can finely tune the coordinates of a single dot for your filter. The number of available dots to choose is dependent on your main filter's dot count.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "note filter",     pianoName: "N.Flt",                  maxRawVol: 10,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.noteFilter,
            promptName: "Note Filter",                  promptDesc: ["This setting controls a few separate things for your instrument's note filter.", "When the option 'morph' is selected, your modulator values will indicate a sub-filter index of your note filter to 'morph' to over time. For example, a change from 0 to 1 means your main filter (default) will morph to sub-filter 1 over the specified duration. You can shape the main filter and sub-filters in the large filter editor ('+' button). If your two filters' number, type, and order of filter dots all match up, the morph will happen smoothly and you'll be able to hear them changing. If they do not match up, the filters will simply jump between each other.", "Note that filters will morph based on endpoints in the pattern editor. So, if you specify a morph from sub-filter 1 to 4 but do not specifically drag in new endpoints for 2 and 3, it will morph directly between 1 and 4 without going through the others.", "If you target Dot X or Dot Y, you can finely tune the coordinates of a single dot for your filter. The number of available dots to choose is dependent on your main filter's dot count.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "bit crush",       pianoName: "Bitcrush",               maxRawVol: Config.bitcrusherQuantizationRange-1,                   newNoteVol: Math.round(Config.bitcrusherQuantizationRange / 2),           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.bitcrusher,
            promptName: "Instrument Bit Crush",         promptDesc: ["This setting controls the bit crush of your instrument, just like the bit crush slider.", "At a value of $LO, no bit crush will be applied. This increases and the bit crush effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "freq crush",      pianoName: "Freq Crush",             maxRawVol: Config.bitcrusherFreqRange-1,                           newNoteVol: Math.round(Config.bitcrusherFreqRange / 2),                   forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.bitcrusher,
            promptName: "Instrument Frequency Crush",   promptDesc: ["This setting controls the frequency crush of your instrument, just like the freq crush slider.", "At a value of $LO, no frequency crush will be applied. This increases and the frequency crush effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "echo",            pianoName: "Echo",                   maxRawVol: Config.echoSustainRange-1,                              newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.echo,
            promptName: "Instrument Echo Sustain",      promptDesc: ["This setting controls the echo sustain (echo loudness) of your instrument, just like the echo slider.", "At $LO, your instrument will have no echo sustain and echo will not be audible. Echo sustain increases and the echo effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "echo delay",      pianoName: "Echo Delay",             maxRawVol: Config.echoDelayRange,                                  newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Instrument Echo Delay",        promptDesc: ["This setting controls the echo delay of your instrument, just like the echo delay slider.", "At $LO, your instrument will have very little echo delay, and this increases up to 2 beats of delay at $HI.", "[OVERWRITING] [$LO - $HI] [~beats ÷12]" ] }, 

        { name: "chorus",          pianoName: "Chorus",                 maxRawVol: Config.chorusRange-1,                                   newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.chorus,
            promptName: "Instrument Chorus",            promptDesc: ["This setting controls the chorus strength of your instrument, just like the chorus slider.", "At $LO, the chorus effect will be disabled. The strength of the chorus effect increases up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "eq filt cut",     pianoName: "EQFlt Cut",              maxRawVol: Config.filterSimpleCutRange - 1,                        newNoteVol: Config.filterSimpleCutRange - 1,                              forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "EQ Filter Cutoff Frequency",   promptDesc: ["This setting controls the filter cut position of your instrument, just like the filter cut slider.", "This setting is roughly analagous to the horizontal position of a single low-pass dot on the advanced filter editor. At lower values, a wider range of frequencies is cut off.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "eq filt peak",    pianoName: "EQFlt Peak",             maxRawVol: Config.filterSimplePeakRange - 1,                       newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "EQ Filter Peak Gain",          promptDesc: ["This setting controls the filter peak position of your instrument, just like the filter peak slider.", "This setting is roughly analagous to the vertical position of a single low-pass dot on the advanced filter editor. At lower values, the cutoff frequency will not be emphasized, and at higher values you will hear emphasis on the cutoff frequency.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "note filt cut",   pianoName: "N.Flt Cut",              maxRawVol: Config.filterSimpleCutRange - 1,                        newNoteVol: Config.filterSimpleCutRange - 1,                              forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.noteFilter,
            promptName: "Note Filter Cutoff Frequency", promptDesc: ["This setting controls the filter cut position of your instrument, just like the filter cut slider.", "This setting is roughly analagous to the horizontal position of a single low-pass dot on the advanced filter editor. At lower values, a wider range of frequencies is cut off.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "note filt peak",  pianoName: "N.Flt Peak",             maxRawVol: Config.filterSimplePeakRange - 1,                       newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.noteFilter,
            promptName: "Note Filter Peak Gain",        promptDesc: ["This setting controls the filter peak position of your instrument, just like the filter peak slider.", "This setting is roughly analagous to the vertical position of a single low-pass dot on the advanced filter editor. At lower values, the cutoff frequency will not be emphasized, and at higher values you will hear emphasis on the cutoff frequency.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "pitch shift",     pianoName: "Pitch Shift",            maxRawVol: Config.pitchShiftRange - 1,                             newNoteVol: Config.pitchShiftCenter,                                      forSong: false,   convertRealFactor: -Config.pitchShiftCenter,             associatedEffect: EffectType.pitchShift,
            promptName: "Pitch Shift",                  promptDesc: ["This setting controls the pitch offset of your instrument, just like the pitch shift slider.", "At $MID your instrument will have no pitch shift. This increases as you decrease toward $LO pitches (half-steps) at the low end, or increases towards +$HI pitches at the high end.", "[OVERWRITING] [$LO - $HI] [pitch]"] },

        { name: "sustain",         pianoName: "Sustain",                maxRawVol: Config.stringSustainRange - 1,                          newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Picked String Sustain",        promptDesc: ["This setting controls the sustain of your picked string instrument, just like the sustain slider.", "At $LO, your instrument will have minimum sustain and sound 'plucky'. This increases to a more held sound as your modulator approaches the maximum, $HI.", "[OVERWRITING] [$LO - $HI]"] },

        { name: "mix volume",      pianoName: "Mix Vol.",               maxRawVol: Config.volumeRange,                                     newNoteVol: Math.ceil(Config.volumeRange / 2),                            forSong: false,   convertRealFactor: Math.ceil(-Config.volumeRange / 2.0), associatedEffect: EffectType.length,
            promptName: "Mix Volume",                   promptDesc: ["This setting affects the volume of your instrument as if its volume slider had been moved.", "At $MID, an instrument's volume will be unchanged from default. This means you can still use the volume sliders to mix the base volume of instruments, since this setting and the default value work multiplicatively. The volume gradually increases up to $HI, or decreases down to mute at $LO.", "Unlike the 'note volume' setting, mix volume is very straightforward and simply affects the resultant instrument volume after all effects are applied.", "[MULTIPLICATIVE] [$LO - $HI]"] },

        { name: "fm slider 5",     pianoName: "FM 5",                   maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Slider 5",                  promptDesc: ["This setting affects the strength of the fifth FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"] },

        { name: "fm slider 6",     pianoName: "FM 6",                   maxRawVol: 15,                                                     newNoteVol: 15,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Slider 6",                  promptDesc: ["This setting affects the strength of the sixth FM slider, just like the corresponding slider on your instrument.", "It works in a multiplicative way, so at $HI your slider will sound the same is its default value, and at $LO it will sound like it has been moved all the way to the left.", "For the full range of control with this mod, move your underlying slider all the way to the right.", "[MULTIPLICATIVE] [$LO - $HI] [%]"] },
            
        { name: "envelope speed",  pianoName: "EnvelopeSpd",            maxRawVol: 50,                                                     newNoteVol: 12,                                                           forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Envelope Speed",               promptDesc: ["This setting controls how fast all of the envelopes for the instrument play.", "At $LO, your instrument's envelopes will be frozen, and at values near there they will change very slowly. At 12, the envelopes will work as usual, performing at normal speed. This increases up to $HI, where the envelopes will change very quickly. The speeds are given below:", "[0-4]: x0, x1/16, x⅛, x⅕, x¼,", "[5-9]: x⅓, x⅖, x½, x⅔, x¾,", "[10-14]: x⅘, x0.9, x1, x1.1, x1.2,", "[15-19]: x1.3, x1.4, x1.5, x1.6, x1.7,", "[20-24]: x1.8, x1.9, x2, x2.1, x2.2,", "[25-29]: x2.3, x2.4, x2.5, x2.6, x2.7,", "[30-34]: x2.8, x2.9, x3, x3.1, x3.2,", "[35-39]: x3.3, x3.4, x3.5, x3.6, x3.7," ,"[40-44]: x3.8, x3.9, x4, x4.15, x4.3,", "[45-50]: x4.5, x4.8, x5, x5.5, x6, x8", "[OVERWRITING] [$LO - $HI]"] },
            
        { name: "dynamism",        pianoName: "Dynamism",               maxRawVol: Config.supersawDynamismMax,                             newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Supersaw Dynamism",            promptDesc: ["This setting controls the supersaw dynamism of your instrument, just like the dynamism slider.", "At $LO, your instrument will have only a single pulse contributing. Increasing this will raise the contribution of other waves which is similar to a chorus effect. The effect gets more noticeable up to the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]},

        { name: "spread",          pianoName: "Spread",                 maxRawVol: Config.supersawSpreadMax,                               newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Supersaw Spread",              promptDesc: ["This setting controls the supersaw spread of your instrument, just like the spread slider.", "At $LO, all the pulses in your supersaw will be at the same frequency. Increasing this value raises the frequency spread of the contributing waves, up to a dissonant spread at the max value, $HI.", "[OVERWRITING] [$LO - $HI]"]},

        { name: "shape",           pianoName: "Shape",                  maxRawVol: Config.supersawShapeMax,                                newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Supersaw Shape",               promptDesc: ["This setting controls the supersaw shape of your instrument, just like the Saw↔Pulse slider.", "As the slider's name implies, this effect will give you a sawtooth wave at $LO, and a full pulse width wave at $HI, in which the width can be controlled via its slider/modulator. Values in between will be a blend of the two.", "[OVERWRITING] [$LO - $HI] [%]"]},

        { name: "fm pwm 1",        pianoName: "FM PWM 1",               maxRawVol: Config.pulseWidthRange * 2,                             newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Pulse Width 1",             promptDesc: ["This setting controls the width of the pulse wave for the first FM operator, just like the pulse width slider, with double the range.", "At $HI, your instrument will sound like a very thin pulse wave (on 99% of the time). It will gradually sound thicker towards $MID, where it will sound like a pure square wave (on 50% of the time), and narrower down after $MID down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "fm pwm 2",        pianoName: "FM PWM 2",               maxRawVol: Config.pulseWidthRange * 2,                             newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Pulse Width 2",             promptDesc: ["This setting controls the width of the pulse wave for the second FM operator, just like the pulse width slider, with double the range.", "At $HI, your instrument will sound like a very thin pulse wave (on 99% of the time). It will gradually sound thicker towards $MID, where it will sound like a pure square wave (on 50% of the time), and narrower down after $MID down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "fm pwm 3",        pianoName: "FM PWM 3",               maxRawVol: Config.pulseWidthRange * 2,                             newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Pulse Width 3",             promptDesc: ["This setting controls the width of the pulse wave for the third FM operator, just like the pulse width slider, with double the range.", "At $HI, your instrument will sound like a very thin pulse wave (on 99% of the time). It will gradually sound thicker towards $MID, where it will sound like a pure square wave (on 50% of the time), and narrower down after $MID down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "fm pwm 4",        pianoName: "FM PWM 4",               maxRawVol: Config.pulseWidthRange * 2,                             newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Pulse Width 4",             promptDesc: ["This setting controls the width of the pulse wave for the fourth FM operator, just like the pulse width slider, with double the range.", "At $HI, your instrument will sound like a very thin pulse wave (on 99% of the time). It will gradually sound thicker towards $MID, where it will sound like a pure square wave (on 50% of the time), and narrower down after $MID down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "fm pwm 5",        pianoName: "FM PWM 5",               maxRawVol: Config.pulseWidthRange * 2,                             newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Pulse Width 5",             promptDesc: ["This setting controls the width of the pulse wave for the fifth FM operator, just like the pulse width slider, with double the range.", "At $HI, your instrument will sound like a very thin pulse wave (on 99% of the time). It will gradually sound thicker towards $MID, where it will sound like a pure square wave (on 50% of the time), and narrower down after $MID down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "fm pwm 6",        pianoName: "FM PWM 6",               maxRawVol: Config.pulseWidthRange * 2,                             newNoteVol: Config.pulseWidthRange,                                       forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "FM Pulse Width 6",             promptDesc: ["This setting controls the width of the pulse wave for the sixth FM operator, just like the pulse width slider, with double the range.", "At $HI, your instrument will sound like a very thin pulse wave (on 99% of the time). It will gradually sound thicker towards $MID, where it will sound like a pure square wave (on 50% of the time), and narrower down after $MID down to $LO, where it will be inaudible (as it is on 0% of the time).", "Changing pulse width randomly between a few values is a common strategy in chiptune music to lend some personality to a lead instrument.", "[OVERWRITING] [$LO - $HI] [%Duty]"] },

        { name: "slide speed",     pianoName: "Slide Speed",            maxRawVol: 23,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.transition,
            promptName: "Slide Speed",                  promptDesc: ["This setting controls the speed at which your instrument 'slides' between notes.", "Note that the lower numbers will slide faster, while the higher numbers will slide slower.", "[OVERWRITING] [$HI - $LO]"]},

        { name: "strum speed",     pianoName: "Strum Speed",            maxRawVol: 23,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.chord,
            promptName: "Strum Speed",                  promptDesc: ["This setting controls the speed at which your instrument's chords strum, just like the strum speed slider.", "Note that the lower numbers will strum faster, while the higher numbers will strum slower.", "[OVERWRITING] [$HI - $LO]"]},

        { name: "wavetable speed", pianoName: "WavetableSpd",           maxRawVol: Config.wavetableSpeedMax,                               newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 0,                                    associatedEffect: EffectType.length,
            promptName: "Wavetable Speed",              promptDesc: ["This setting controls the speed at which your wavetable instrument swaps between waves.", "[OVERWRITING] [$LO - $HI]"]},
        
        { name: "cycle wave",      pianoName: "Cycle Wave",             maxRawVol: 31,                                                     newNoteVol: 0,                                                            forSong: false,   convertRealFactor: 1,                                    associatedEffect: EffectType.length,
            promptName: "Cycle Wave",                   promptDesc: ["This setting sets the current position in the cycle your wavetable instrument is in according to the value you put.", "Note that only the value at the beginning of the note will count.", "If waves are missing from the cycle, this wave that will play from the modulator will loop around the cycle depending on the number and the amount of waves that are removed from the cycle. (Example: If only 9 waves are in the cycle, 23 on this modulator would set the current wave to wave 5.)", "[$LO - $HI]"]},
        
        // Issue#7, Issue#9 - More modulators.
    ]);
}

function centerWave(wave: Array<number>): Float32Array {
    let sum: number = 0.0;
    for (let i: number = 0; i < wave.length; i++) sum += wave[i];
    const average: number = sum / wave.length;
    for (let i: number = 0; i < wave.length; i++) wave[i] -= average;
    performIntegral(wave);
    // The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
    wave.push(0);
    return new Float32Array(wave);
}
function centerAndNormalizeWave(wave: Array<number>): Float32Array {
    let magn: number = 0.0;

    centerWave(wave);

    // Going to length-1 because an extra 0 sample is added on the end as part of centerWave, which shouldn't impact magnitude calculation.
    for (let i: number = 0; i < wave.length - 1; i++) {
        magn += Math.abs(wave[i]);
    }
    const magnAvg: number = magn / (wave.length - 1);

    for (let i: number = 0; i < wave.length - 1; i++) {
        wave[i] = wave[i] / magnAvg;
    }

    return new Float32Array(wave);

}
export function performIntegral(wave: { length: number, [index: number]: number }): Float32Array {
    // Perform the integral on the wave. The synth function will perform the derivative to get the original wave back but with antialiasing.
    let cumulative: number = 0.0;
    let newWave: Float32Array = new Float32Array(wave.length);
    for (let i: number = 0; i < wave.length; i++) {
        newWave[i] = cumulative;
        cumulative += wave[i];
    }

    return newWave;
}
export function performIntegralOld(wave: { length: number, [index: number]: number }): void {
	// Old ver used in harmonics/picked string instruments, manipulates wave in place.
	let cumulative: number = 0.0;
	for (let i: number = 0; i < wave.length; i++) {
		const temp = wave[i];
		wave[i] = cumulative;
		cumulative += temp;
	}
}

export function getPulseWidthRatio(pulseWidth: number): number {
    // BeepBox formula for reference
    //return Math.pow(0.5, (Config.pulseWidthRange - 1 - pulseWidth) * Config.pulseWidthStepPower) * 0.5;
    return pulseWidth / (Config.pulseWidthRange * 2);
}


// The function arguments will be defined in FFT.ts, but I want
// SynthConfig.ts to be at the top of the compiled JS so I won't directly
// depend on FFT here. synth.ts will take care of importing FFT.ts.
//function inverseRealFourierTransform(array: {length: number, [index: number]: number}, fullArrayLength: number): void;
//function scaleElementsByFactor(array: {length: number, [index: number]: number}, factor: number): void;
export function getDrumWave(index: number, inverseRealFourierTransform: Function | null, scaleElementsByFactor: Function | null/*, seed: number, seedAlgorithm: Function | null*/): Float32Array {
    let wave: Float32Array | null = Config.chipNoises[index].samples;
    if (wave == null) {
        wave = new Float32Array(Config.chipNoiseLength + 1);
        Config.chipNoises[index].samples = wave;

        if (index == 0) {
            // The "retro" drum uses a "Linear Feedback Shift Register" similar to the NES noise channel.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 1 << 14;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 1) {
            // White noise is just random values for each sample.
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = Math.random() * 2.0 - 1.0;
            }
        } else if (index == 2) {
            // The "clang" noise wave is based on a similar noise wave in the Modded BeepBox made by DAzombieRE.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 2 << 14;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 3) {
            // The "buzz" noise wave is based on a similar noise wave in the Modded BeepBox made by DAzombieRE.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 10 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 4) {
            // "hollow" drums, designed in frequency space and then converted via FFT:
            drawNoiseSpectrum(wave, Config.chipNoiseLength, 10, 11, 1, 1, 0);
            drawNoiseSpectrum(wave, Config.chipNoiseLength, 11, 14, .6578, .6578, 0);
            inverseRealFourierTransform!(wave, Config.chipNoiseLength);
            scaleElementsByFactor!(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
        } else if (index == 5) {
            // The "shine" noise type from ModBox.
            var drumBuffer = 1;
            for (var i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 10 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 6) {
            // The "deep" noise type from ModBox.
            drawNoiseSpectrum(wave, Config.chipNoiseLength, 1, 10, 1, 1, 0);
            drawNoiseSpectrum(wave, Config.chipNoiseLength, 20, 14, -2, -2, 0);
            inverseRealFourierTransform!(wave, Config.chipNoiseLength);
            scaleElementsByFactor!(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
        } else if (index == 7) {
            // The "cutter" noise type from ModBox.
            var drumBuffer = 1;
            for (var i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 4.0 * (Math.random() * 14 + 1) - 27.0;
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 15 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 8) {
            // The "metallic" noise type from ModBox.
            var drumBuffer = 1;
            for (var i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) / 2.0 - 0.25;
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer -= 10 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 9) {
            // The "static" noise type from GoldBox.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 8 ^ 2 << 16;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 10) {
            // The "retro clang" noise type from Zefbox.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                     newBuffer += 3 << 14;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 11) {
            // The "chime" noise type from Zefbox.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 2 << 50;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 12) {
            // The "harsh" noise type from Zefbox.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 4.0 / 11 - 0.17;
                let newBuffer: number = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 15 << 2;
                }
                drumBuffer = newBuffer;
            } 
        } else if (index == 13) {
            // The "trill" noise type from Zefbox.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) / 4.0 * Math.random() - 0.11;
                let newBuffer: number = drumBuffer >> 2;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer -= 4 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 14) {
            // The "detuned periodic" noise type from ModBox.
            let drumBuffer: number = 1;
            for (let i: number = 0; i < Config.chipNoiseLength-1; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                let newBuffer: number = drumBuffer >> 2;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 4 << 14;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 15) {
            // The "snare" noise type from ModBox.
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = Math.random() * 2.0 - 1.0;
            }
        } else if (index == 16) {
            // "1-Bit White" from UltraBox.
            for (let i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = Math.round(Math.random()) - 0.5;
            }
        } else if (index == 17) {
            // "1-Bit Metallic" from UltraBox.
            var drumBuffer = 1;
            for (var i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = Math.round((drumBuffer & 1)) - 0.5;
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer -= 10 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 18) {
            // "Crackling" from UltraBox.
            for (let i = 0; i < Config.chipNoiseLength; i++) {
                var ultraboxnewchipnoiserand = Math.random();
                wave[i] = Math.pow(ultraboxnewchipnoiserand, Math.clz32(ultraboxnewchipnoiserand)) - 0.15;
            }
        } else if (index == 19) {
            // "Pink" noise from UltraBox (noise.js).
            var b0 = 0, b1 = 0, b2 = 0, b3, b4, b5, b6;
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
            
            for (let i = 0; i < Config.chipNoiseLength; i++) {
                var white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                wave[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                wave[i] *= 0.44;
                b6 = white * 0.115926;
                // from https://github.com/zacharydenton/noise.js, MIT license soooo
            }
        } else if (index == 20) {
            // "Brownian" noise from UltraBox (noise.js).
            var lastOut = 0.0;
            
            for (let i = 0; i < Config.chipNoiseLength; i++) {
                var white = Math.random() * 2 - 1;
                wave[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = wave[i];
                wave[i] *= 14;
                // This is also from noise.js.
            }
        } else if (index == 21) {
            // "Perlin Noise", a smooth variant of white noise.
            // https://gpfault.net/posts/perlin-sound.txt.html
            const freq: number = 440 * 7;
            for (let i: number = 0; i < (Config.chipNoiseLength); i++) {
                const x1: number = (i / Config.chipNoiseLength) * freq;
                wave[i] = perlinNoise(x1);
            }
        } else if (index == 22) {
            // "Fractal Noise", a modified variant of perlin noise.
            // https://gpfault.net/posts/perlin-sound.txt.html
            const f1: number = 110 * 5;
            const f2: number = 220 * 5;
            const f3: number = 440 * 5;
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                const x1: number = (i / Config.chipNoiseLength) * f1;
                const x2: number = (i / Config.chipNoiseLength) * f2;
                const x3: number = (i / Config.chipNoiseLength) * f3;
                const n1: number = perlinNoise(x1);
                const n2: number = perlinNoise(x2);
                const n3: number = perlinNoise(x3);
                const combined: number = (0.5 * n1 + 0.3 * n2 + 0.2 * n3);
                wave[i] = combined;
            }
        } else if (index == 23) {
            // "Vinyl Crackle", based off of the noisy sound they make.
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                const v1: number = Math.random() * 2 - 1;
                const v2: number = Math.random() * 0.25 - 0.125;
                const bias: number = 170;
                const biased: number = v1 > 0 ? Math.pow(v1, bias) : -Math.pow(-v1, bias);
                const x1: number = clamp(-3, 3 + 1, biased * 4);
                const final: number = x1 + v2;
                wave[i] = final;
            }
        } else if (index == 24) {
            // "Noise Square", a noise formation shaped like a square wave.
            for (let i: number = 0; i < Config.chipNoiseLength; i++) {
                const square: number = mod(Math.round(i/32 + 0.5), 2);
                const noise: number = Math.random();
                wave[i] = noise * square - 0.5;
            }
        } else {
            throw new Error("Unrecognized drum index: " + index);
        }
        wave[Config.chipNoiseLength] = wave[0];
    }
    return wave;
}

export function drawNoiseSpectrum(wave: Float32Array, waveLength: number, lowOctave: number, highOctave: number, lowPower: number, highPower: number, overallSlope: number): number {
    const referenceOctave: number = 11;
    const referenceIndex: number = 1 << referenceOctave;
    const lowIndex: number = Math.pow(2, lowOctave) | 0;
    const highIndex: number = Math.min(waveLength >> 1, Math.pow(2, highOctave) | 0);
    const retroWave: Float32Array = getDrumWave(0, null, null);
    let combinedAmplitude: number = 0.0;
    for (let i: number = lowIndex; i < highIndex; i++) {

        let lerped: number = lowPower + (highPower - lowPower) * (Math.log2(i) - lowOctave) / (highOctave - lowOctave);
        let amplitude: number = Math.pow(2, (lerped - 1) * 7 + 1) * lerped;

        amplitude *= Math.pow(i / referenceIndex, overallSlope);

        combinedAmplitude += amplitude;

        // Add two different sources of psuedo-randomness to the noise
        // (individually they aren't random enough) but in a deterministic
        // way so that live spectrum editing doesn't result in audible pops.
        // Multiply all the sine wave amplitudes by 1 or -1 based on the
        // LFSR retro wave (effectively random), and also rotate the phase
        // of each sine wave based on the golden angle to disrupt the symmetry.
        amplitude *= retroWave[i];
        const radians: number = 0.61803398875 * i * i * Math.PI * 2.0;

        wave[i] = Math.cos(radians) * amplitude;
        wave[waveLength - i] = Math.sin(radians) * amplitude;
    }

    return combinedAmplitude;
}
function perlinNoiseCurve(t: number): number {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
const perlinNoiseGradientRandom: number[] = [];
for (let i: number = 0; i < 440*7; i++) {
    perlinNoiseGradientRandom[i] = (i == 0 || i == 440*7-1) ? 0.0 : Math.random();
}
function perlinNoiseGradient(p: number): number {
    return perlinNoiseGradientRandom[Math.floor(p) % perlinNoiseGradientRandom.length] > 0.5 ? 1.0 : -1.0;
}
function perlinNoise(p: number): number {
    const p0: number = Math.floor(p);
    const p1: number = p0 + 1.0;
    const t: number = p - p0;
    const fade_t: number = perlinNoiseCurve(t);
    const g0: number = perlinNoiseGradient(p0);
    const g1: number = perlinNoiseGradient(p1);
    
    return (1.0 - fade_t) * g0 * (p - p0) + fade_t * g1 * (p - p1);
}

function generateSineWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.sin(i * Math.PI * 2 / Config.sineWaveLength);
    }
    return wave;
}

function generateTriWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.asin(Math.sin(i * Math.PI * 2 / Config.sineWaveLength)) / (Math.PI / 2);
    }
    return wave;
}

function generateTrapezoidWave(drive: number = 2): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.max(-1, Math.min(1, Math.asin(Math.sin(i * Math.PI * 2 / Config.sineWaveLength)) * drive));
    }
    return wave;
}

function generateSquareWave(phaseWidth: number = 0): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    const centerPoint: number = Config.sineWaveLength / 4;
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = +((Math.abs(i - centerPoint) < phaseWidth * Config.sineWaveLength / 2)
        || ((Math.abs(i - Config.sineWaveLength - centerPoint) < phaseWidth * Config.sineWaveLength / 2))) * 2 - 1;
    }
    return wave;
}

function generateSawWave(inverse: boolean = false): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = ((i + (Config.sineWaveLength / 4)) * 2 / Config.sineWaveLength) % 2 - 1;
        wave[i] = inverse ? -wave[i] : wave[i];
    }
    return wave;
}

function generateClangNoise() { 
    let drumBuffer: number = 1;
    const wave = new Float32Array(Config.sineWaveLength + 1);
    for (let i = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = (drumBuffer & 1) * 2 - 1.0;
        let newBuffer: number = drumBuffer >> 1;
        if (((drumBuffer + newBuffer) & 1) == 1) {
            newBuffer += 2 << 14;
        }
        drumBuffer = newBuffer;
    }
    return wave;
}

function generateMetallicNoise() {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        let drumBuffer = 1;
        for (let j = 0; j < Config.sineWaveLength; j++) {
            wave[j] = (drumBuffer & 1) * 1.25 - 0.33;
            let newBuffer = drumBuffer >> 1;
            if (((drumBuffer + newBuffer) & 1) == 1) {
                newBuffer -= 10 << 2;
            }
            drumBuffer = newBuffer;
        }
    }
    return wave;
}

function generateQuasiSineWave() {
    const wave = new Float32Array(Config.sineWaveLength + 1);
    for (let i = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.round(Math.sin(i * Math.PI * 2 / Config.sineWaveLength));
    }
    return wave;
}

function generateSecantWave() {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = 1 - (Math.sin((i / Config.sineWaveLength) * Math.PI * 2) % 2 + 2) % 2;
    }
    return wave;
}

function generateAbsineWave() {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.abs(Math.sin(i * Math.PI / Config.sineWaveLength)) * 2 - 1;
    }
    return wave;
}

function generateSemiSineWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.max(Math.sin(i * Math.PI * 2 / Config.sineWaveLength), 0) * 2 - 1;
    }
    return wave;
}

function generateCamelsineWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.max(Math.cos((2 * i * Math.PI + (Math.PI / 2) * 3) / Config.sineWaveLength) * Math.abs(Math.sin((Math.PI * i * 2 + (Math.PI / 2)) / Config.sineWaveLength)), 0) * 4 - 1;
    }
    return wave;
}

function generatePulsineWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.cos((2 * i * Math.PI) / Config.sineWaveLength) * Math.abs(Math.sin((2 * i * Math.PI) / Config.sineWaveLength)) + (0.5 * Math.sin((4 * i * Math.PI) / Config.sineWaveLength));
    }
    return wave;
}

function generateSharkSineWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.abs(Math.sin(i * Math.PI / Config.sineWaveLength)) * Math.round(mod((i + 0.5) / Config.sineWaveLength, 1)) * 2 - 1;
    }
    return wave;
}

function generateLogSawWave(): Float32Array {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        let l1: number = mod(Math.PI * 2 * i / Config.sineWaveLength, 2 * Math.PI);
        let l2: number = Math.cos(l1 / 2) < 0 ? 1 : -1;
        wave[i] = l2 + Math.cos((l1 + Math.PI) / 2) * l2;
    }
    return wave;
}

function generateWhiteNoise() {
    const wave: Float32Array = new Float32Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.random() * 2 - 1;
    }
    return wave;
}

export function getArpeggioPitchIndex(pitchCount: number, useFastTwoNoteArp: boolean, arpeggioPatternType: number, arpeggio: number): number {
    let arpeggioPatternListPicker: any;
    if (arpeggioPatternType == 0) arpeggioPatternListPicker = (Config.normalArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 1) arpeggioPatternListPicker = (Config.legacyArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 2) arpeggioPatternListPicker = (Config.scrambleArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 3) arpeggioPatternListPicker = (Config.oscillateArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 4) arpeggioPatternListPicker = (Config.escalateArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 5) arpeggioPatternListPicker = (Config.shiftArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 6) arpeggioPatternListPicker = (Config.normalBounceArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 7) arpeggioPatternListPicker = (Config.scrambleBounceArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 8) arpeggioPatternListPicker = (Config.oscillateBounceArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 9) arpeggioPatternListPicker = (Config.escalateBounceArpeggioPatterns)[pitchCount - 1];
    else if (arpeggioPatternType == 10) arpeggioPatternListPicker = (Config.shiftBounceArpeggioPatterns)[pitchCount - 1];
    else throw new Error("Unknown arpeggio pattern type in getArpeggioPitchIndex: " + arpeggioPatternType);
    let arpeggioPattern: ReadonlyArray<number> = arpeggioPatternListPicker;
    if (arpeggioPattern != null) {
        if (pitchCount == 2 && useFastTwoNoteArp == false) {
            arpeggioPattern = [0, 0, 1, 1];
        }
        return arpeggioPattern[arpeggio % arpeggioPattern.length];
    } else {
        return arpeggio % pitchCount;
    }
}

// Pardon the messy type casting. This allows accessing array members by numerical index or string name.
export function toNameMap<T extends BeepBoxOption>(array: Array<Pick<T, Exclude<keyof T, "index">>>): DictionaryArray<T> {
    const dictionary: Dictionary<T> = {};
    for (let i: number = 0; i < array.length; i++) {
        const value: any = array[i];
        value.index = i;
        dictionary[value.name] = <T>value;
    }
    const result: DictionaryArray<T> = <DictionaryArray<T>><any>array;
    result.dictionary = dictionary;
    return result;
}

export function effectsIncludeTransition(effects: number): boolean {
    return (effects & (1 << EffectType.transition)) != 0;
}
export function effectsIncludeChord(effects: number): boolean {
    return (effects & (1 << EffectType.chord)) != 0;
}
export function effectsIncludePitchShift(effects: number): boolean {
    return (effects & (1 << EffectType.pitchShift)) != 0;
}
export function effectsIncludeDetune(effects: number): boolean {
    return (effects & (1 << EffectType.detune)) != 0;
}
export function effectsIncludeVibrato(effects: number): boolean {
    return (effects & (1 << EffectType.vibrato)) != 0;
}
export function effectsIncludeNoteFilter(effects: number): boolean {
    return (effects & (1 << EffectType.noteFilter)) != 0;
}
export function effectsIncludeWavefold(effects: number): boolean {
    return (effects & (1 << EffectType.wavefold)) != 0;
}
export function effectsIncludeDistortion(effects: number): boolean {
    return (effects & (1 << EffectType.distortion)) != 0;
}
export function effectsIncludeClipper(effects: number): boolean {
    return (effects & (1 << EffectType.clipper)) != 0;
}
export function effectsIncludeBitcrusher(effects: number): boolean {
    return (effects & (1 << EffectType.bitcrusher)) != 0;
}
export function effectsIncludePanning(effects: number): boolean {
    return (effects & (1 << EffectType.panning)) != 0;
}
export function effectsIncludeChorus(effects: number): boolean {
    return (effects & (1 << EffectType.chorus)) != 0;
}
export function effectsIncludeEcho(effects: number): boolean {
    return (effects & (1 << EffectType.echo)) != 0;
}
export function effectsIncludeReverb(effects: number): boolean {
    return (effects & (1 << EffectType.reverb)) != 0;
}
export function rawChipToIntegrated(raw: DictionaryArray<ChipWave>): DictionaryArray<ChipWave> {
    const newArray: Array<ChipWave> = new Array<ChipWave>(raw.length);
    const dictionary: Dictionary<ChipWave> = {};
    for (let i: number = 0; i < newArray.length; i++) {
        newArray[i] = Object.assign([], raw[i]);
        const value: any = newArray[i];
        value.index = i;
        dictionary[value.name] = <ChipWave>value;
    }
    for (let key in dictionary) {
        dictionary[key].samples = performIntegral(dictionary[key].samples);
    }
    const result: DictionaryArray<ChipWave> = <DictionaryArray<ChipWave>><any>newArray;
    result.dictionary = dictionary;
    return result;
}