/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { fork, take } from "redux-saga/effects";
import { targetFlow } from "./target";
import { serverFlow } from "./server";
import { Server, Target, logger, TargetConnection, Turbo } from "..";
import { channel, Channel } from "redux-saga";

export type LogFunc = (str: string) => void;

export function* rootSaga(turbo: Turbo, server: Server, target: Target) {
    const connectionChannel: Channel<TargetConnection | -1> = channel<
        TargetConnection | -1
    >();
    const killChannel: Channel<Error> = channel<Error>();

    logger.verbose("starting sagas");

    yield fork(targetFlow, target, connectionChannel, killChannel);
    logger.verbose("finish target flow");

    yield fork(serverFlow, turbo, server, connectionChannel, killChannel);
    logger.verbose("finish server flow");

    try {
        yield take(killChannel);
    } catch (e) {
        logger.error(e.stack);
    } finally {
        turbo.env.exit();
    }
}
