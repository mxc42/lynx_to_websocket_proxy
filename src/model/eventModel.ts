import { ResultModel } from "./resultModel";

// this class exists for backwards compatibility with the frontend
export class HeaderModel {
    constructor(
        public title: string = "",
    ){}
}

// this class exists for backwards compatibility with the frontend
export class TrailerModel {
    constructor(
        public heat: string = "",
        public wind: string = "",
        public dist: string = "",
    ) { }
}

export class EventModel {
    public results: ResultModel[] = [];
    public title: string = "";
    public heat: string = "";
    public wind: string = "";
    public dist: string = "";
    public trailer: TrailerModel = new TrailerModel();
    public header: HeaderModel = new HeaderModel();

    constructor() { }

    public toString(): string {
        return `${this.title} - Heat ${this.heat} - Wind: ${this.wind} - Distance: ${this.dist}\n` +
            this.results.map(r => r.toString()).join('\n');
    }
}
