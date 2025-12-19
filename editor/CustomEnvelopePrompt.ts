// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
// import { Config } from "../synth/SynthConfig";
import { Instrument, EnvelopeSettings, DrumsetEnvelopeSettings } from "../synth/synth";
import { ColorConfig } from "./ColorConfig";
import { SongDocument } from "./SongDocument";
import { ChangeCustomEnvelopePointHeights } from "./changes";
//import { EnvelopeLineGraph } from "./EnvelopeEditor";


const { button, div, h2, canvas } = HTML;

class CustomEnvGridCanvas {
	private readonly _doc: SongDocument;
	//private _mouseDown: boolean = false;
	public startingPointHeights: number[] = [];
	public pointHeights: number[] = [];
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private readonly _graphWidth: number = 900;
	private readonly _graphHeight: number = 400;

	constructor(public readonly canvas: HTMLCanvasElement, doc: SongDocument, private _index: number, private _drumset: boolean) {
		this._doc = doc;

		const envelope = this._compileEnvelope();
		for (let i = 0; i < envelope.customEnvGridWidth; i++) {
			this.startingPointHeights[i] = envelope.customEnvGridPoints[i].height;
			this.pointHeights[i] = envelope.customEnvGridPoints[i].height;
		}

		this.render();

		this.canvas.addEventListener("mousedown", this._whenMousePressed);
    }

	public cleanUp(): void {
		this.canvas.removeEventListener("mousedown", this._whenMousePressed);
	}

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
		const envelope = this._compileEnvelope();

		const pointIndexWidth: number = graphWidth / envelope.customEnvGridWidth;
		const pointIndexHeight: number = graphHeight / (envelope.customEnvGridHeight - 1);
		let x: number = graphX;
		let y: number = graphHeight;

		var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, graphWidth, graphHeight);

		// Draw background.
        ctx.fillRect(0, 0, graphX, graphY);

		ctx.strokeStyle = ColorConfig.getComputed("--ui-widget-background");
		ctx.fillStyle = ColorConfig.getComputed("--playhead");

		// Draw many lines to resemble a grid.
		ctx.beginPath();
		ctx.lineWidth = 3;
		// Start with vertical lines spanning the canvas width.
		ctx.moveTo(x, y);
		for (let i = 0; i < envelope.customEnvGridWidth-1; i++) {
			x = x + pointIndexWidth;
			ctx.moveTo(x, y);
			ctx.lineTo(x, 0);
		}
		// Then draw horizontal lines spanning the canvas height.
		x = 0;
		for (let i = 0; i < envelope.customEnvGridHeight-1; i++) {
			y = y - pointIndexHeight;
			ctx.moveTo(0, y);
			ctx.lineTo(graphWidth, y);
		}
		ctx.stroke();
		ctx.closePath();
		// Now we'll move down and draw a line seperating the point canvas and the area where the
		// connections buttons go.
		ctx.strokeStyle = ColorConfig.getComputed("--ui-widget-focus");
		ctx.beginPath();
		y = graphHeight;
		ctx.moveTo(0, y);
		ctx.lineTo(graphWidth, y);
		ctx.stroke();
		ctx.closePath();
		// Boxes representing each point's height value.
		let color: string = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		x = graphX - pointIndexWidth;
		for (let i = 0; i < envelope.customEnvGridWidth; i++) {
			x += pointIndexWidth;
			y = envelope.customEnvGridPoints[i].height * pointIndexHeight;
			ctx.fillRect(x, graphHeight - y, pointIndexWidth, (graphHeight - y) + (pointIndexHeight - pointIndexHeight * ((envelope.customEnvGridHeight-1) - envelope.customEnvGridPoints[i].height)));
		}
	}

	public render() {
		this._drawCanvas(0, 0, this._graphWidth, this._graphHeight);
	}

	private _whenMousePressed = (event: MouseEvent): void => {
		const envelope = this._compileEnvelope();

		const pointIndexWidth: number = this._graphWidth / envelope.customEnvGridWidth;
		const pointIndexHeight: number = this._graphHeight / (envelope.customEnvGridHeight - 1);

		event.preventDefault();
		//this._mouseDown = true;
		const boundingRect: ClientRect = this.canvas.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this.canvas.width / (boundingRect.right - boundingRect.left);
		this._mouseY = this._graphHeight - (((event.clientY || event.pageY) - boundingRect.top) * this.canvas.height / (boundingRect.bottom - boundingRect.top));
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		console.log(this._mouseX, this._mouseY)
		console.log(envelope.customEnvGridPoints)

		const oldPointHeights: number[] = [];
		for (let i = 0; i < envelope.customEnvGridWidth; i++) {
			oldPointHeights[i] = envelope.customEnvGridPoints[i].height;
			if (pointIndexWidth * i < this._mouseX && this._mouseX <= pointIndexWidth * i + pointIndexWidth) {
				this.pointHeights[i] = (Math.ceil(this._mouseY / pointIndexHeight));
			} else {
				this.pointHeights[i] = oldPointHeights[i];
			}
		}

		this.render();
		new ChangeCustomEnvelopePointHeights(this._doc, this._index, oldPointHeights, this.pointHeights);
	}

	private _compileEnvelope() {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const instEnv: EnvelopeSettings = instrument.envelopes[this._index];
        const drumEnv: DrumsetEnvelopeSettings = instrument.drumsetEnvelopes[this._index];
		let envelope;
		if (this._drumset) envelope = drumEnv;
		else envelope = instEnv;
		return envelope;
	}
}

export class CustomEnvelopePrompt implements Prompt {
    public readonly customEnvelopeGrid: CustomEnvGridCanvas = new CustomEnvGridCanvas(canvas({ width: 900, height: 400, style: `border: 2px solid ${ColorConfig.uiWidgetFocus}; position: initial; width: 100%; height: 200px;`, id: "CustomEnvGrid" }), this._doc, this.index, this._drumset);
	private readonly _connectionButtonRow: HTMLDivElement = div({style: "display: flex; flex-direction: row; gap: 4px; height: 2.5em; width: 100%; margin-top: -2px; border: 2px solid var(--ui-widget-focus);"});
	private readonly _customEnvGridRow: HTMLDivElement = div({style: "width: 550px;"}, this.customEnvelopeGrid.canvas, this._connectionButtonRow);

    private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width: 32%; font-size: 15px; margin-bottom: 0;" }, "Confirm");

    public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		h2("Edit Custom Envelope"),
        div({ style: "align-self: center;" },
            this._customEnvGridRow
        ),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
    );

    constructor(private _doc: SongDocument, public index: number, private _drumset: boolean) {
        this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);

		const envelope = (this._drumset) ? this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].drumsetEnvelopes[index] : this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].envelopes[index];
        this.rerender(envelope);
    }

    private _close = (): void => { 
		this._doc.prompt = null;
		this._doc.undo();
	}
		
	public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);

		this.customEnvelopeGrid.cleanUp();
	}

	public rerender = (envelope: EnvelopeSettings | DrumsetEnvelopeSettings): void => {
		for (let i = 0; i < envelope.customEnvGridWidth; i++) {
            let connectionButton: HTMLButtonElement = button({style: "border-radius: 0px 0px 0px 0px; height: 100%; flex: 1;", title: "Linear"},
                // Rising line icon:
                SVG.svg({ style: "pointer-events: none; width: 100%; height: 100%;", preserveAspectRatio: "none", viewBox: "0 0 10 10" }, [
                    SVG.path({ d: "M1 10 10 1 9 0 0 9 1 10 z", fill: "currentColor" }),
                ]),
            ); 
            this._connectionButtonRow.appendChild(connectionButton);
        }

		this.customEnvelopeGrid.render();
		//this._envelopePlotter.render();
	}
		
	private _saveChanges = (): void => {
		this._doc.prompt = null;
		this._doc.record(new ChangeCustomEnvelopePointHeights(this._doc, this.index, this.customEnvelopeGrid.startingPointHeights, this.customEnvelopeGrid.pointHeights))
	}
}