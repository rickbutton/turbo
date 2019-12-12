import { ClientSocket, ClientSocketEvents } from "./baseclient";

type MockFire = {
    fire<N extends keyof ClientSocketEvents>(
        name: N,
        event: ClientSocketEvents[N],
    ): void;
};
export function mockSocket(): jest.Mocked<ClientSocket> & MockFire {
    const events: any = {};
    return {
        connect: jest.fn(),
        end: jest.fn(),
        write: jest.fn(),
        on: jest.fn().mockImplementation((name: any, callback: any): void => {
            if (!events[name]) events[name] = [];
            events[name].push(callback);
        }),
        fire<N extends keyof ClientSocketEvents>(
            name: N,
            event: ClientSocketEvents[N],
        ): void {
            if (events[name]) {
                for (const cb of events[name]) {
                    cb(event);
                }
            }
        },
    };
}
