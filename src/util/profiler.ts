import { Mutex } from 'await-semaphore';

type ProfileRecord = {
    start: number;
    firstResponse: number;
    end: number;
};

interface Profiler {
    records: ProfileRecord[];
    current: ProfileRecord;

    toString: () => Promise<string>;
}

export class TTSProfiler implements Profiler {
    records: ProfileRecord[];
    current: ProfileRecord;
    active = false;
    mutex: Mutex;

    constructor() {
        this.records = [];
        this.current = {
            start: 0,
            firstResponse: 0,
            end: 0
        };

        this.mutex = new Mutex();
    }

    signalStart() {
        console.log(this.mutex);
        this.mutex.use(async () => {
            if (!this.current.start)
                this.current.start = Date.now();
        });
    }

    signalFirstByte() {
        this.mutex.use(async () => {
            if (!this.current.firstResponse)
                this.current.firstResponse = Date.now();
        });
    }

    signalEnd() {
        this.mutex.use(async () => {
            this.current.end = Date.now();
            this.records.push(this.current);

            console.log(`ttf: ${this.current.firstResponse - this.current.start}`);

            this.current = {
                start: 0,
                firstResponse: 0,
                end: 0
            };
        });
    }

    toString() {
        return this.mutex.use(async () => {
            return JSON.stringify({
                type: 'Text-To-Speech',
                data: this.records,
            });
        })
    }
}