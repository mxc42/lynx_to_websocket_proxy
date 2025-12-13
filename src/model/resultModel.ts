export class ResultModel {
    constructor(
        public place: string,
        public lane: string,
        public bib: string,
        public name: string,
        public team: string,
        public mark: string,
        public user2: string, // extra id for new meet manager
    ) { }

    static fromLynxBuffer(buffer: Buffer) {
        // 1,2,758,Sam Killin,Purdue,4:01.45 ;

        let i = 0;
        return new ResultModel(
            buffer.subarray(i, i = buffer.indexOf(44)).toString('ascii'),
            buffer.subarray(++i, i = buffer.indexOf(44, i)).toString('ascii'),
            buffer.subarray(++i, i = buffer.indexOf(44, i)).toString('ascii'),
            buffer.subarray(++i, i = buffer.indexOf(44, i)).toString('ascii'),
            buffer.subarray(++i, i = buffer.indexOf(44, i)).toString('ascii'),
            buffer.subarray(++i, i = buffer.indexOf(44, i)).toString('ascii').trimEnd(),
            buffer.subarray(++i).toString('ascii'),
        );
    }
}
