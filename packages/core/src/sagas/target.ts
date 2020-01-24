/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Target, logger, ActionType, TargetConnection, Action } from "../index";
import { eventChannel, EventChannel, END, Channel, Task } from "redux-saga";
import { takeEvery, put, take, fork, call } from "redux-saga/effects";
import { TargetSagaAction } from "./shared";
import { connect } from "../v8";
import { SetBreakpointsEnabledRequestAction } from "../state";

function setupTarget(target: Target): EventChannel<TargetSagaAction | END> {
    logger.verbose("sagas: setupTarget");

    return eventChannel<TargetSagaAction>(emit => {
        target.on("started", event => {
            emit({
                type: "started",
                host: event.interface.host,
                port: event.interface.port,
            });
        });
        target.on("stopped", () => {
            emit({ type: "stopped" });
        });

        logger.verbose("target setup and starting");

        target.start();
        return () => {
            logger.verbose("target being destroyed");
            target.stop();
        };
    });
}

function* setupConnection(connection: TargetConnection) {
    logger.verbose("sagas: setupConnection");

    return eventChannel<Action>(emit => {
        logger.verbose("setting up target connection");
        connection.on("paused", event => {
            logger.verbose("sagas: target paused");
            emit({ type: "paused", callFrames: event.callFrames });
        });
        connection.on("resumed", () => {
            logger.verbose("sagas: target resumed");
            emit({ type: "resumed" });
        });
        connection.on("scriptParsed", event => {
            logger.verbose(`sagas: script parsed: ${event.script.url}`);
            emit({ type: "add-script", script: event.script });
        });
        connection.on("breakpointResolved", event => {
            logger.verbose("sagas: breakpoint resolved");
            emit({ type: "verify-breakpoint", breakpoint: event.breakpoint });
        });
        connection.on("close", () => emit(END));

        return () => {
            connection.close();
        };
    });
}

function* watchConnectionRequests(target: TargetConnection) {
    yield takeEvery<ActionType>("pause", () => target.pause());
    yield takeEvery<ActionType>("resume", () => target.resume());

    yield takeEvery<ActionType>("stepInto", function*() {
        yield call(() => target.stepInto());
    });
    yield takeEvery<ActionType>("stepOut", function*() {
        yield call(() => target.stepOut());
    });
    yield takeEvery<ActionType>("stepOver", function*() {
        yield call(() => target.stepOver());
    });

    yield takeEvery<ActionType>("set-breakpoint", function*() {
        // TODO
    });
    yield takeEvery<ActionType>("remove-vb-request", function*() {
        // TODO
    });
    yield takeEvery<ActionType>("remove-unvb-request", function*() {
        // TODO
    });
    yield takeEvery("set-b-enable-request", function*(
        a: SetBreakpointsEnabledRequestAction,
    ) {
        if (a.enabled) {
            yield call(() => target.enableBreakpoints());
        } else {
            yield call(() => target.disableBreakpoints());
        }
        yield put<Action>({ type: "set-b-enable", enabled: a.enabled });
    });
}

function* watchConnectionEvents(channel: EventChannel<Action>) {
    while (true) {
        const action: Action = yield take(channel);
        yield put(action);
    }
}

export function* spawnConnection(
    host: string,
    port: number,
    connectionChannel: Channel<TargetConnection | -1>,
) {
    logger.verbose(`sagas: spawnConnection ${host}:${port}`);

    const connection: TargetConnection = yield call(connect, host, port);
    const channel: EventChannel<Action> = yield call(
        setupConnection,
        connection,
    );

    yield call(() => connection.enable());

    yield fork(watchConnectionRequests, connection);
    yield fork(watchConnectionEvents, channel);

    yield put(connectionChannel, connection);

    yield put({ type: "target-connect" });
}

export function* watchTarget(
    channel: EventChannel<TargetSagaAction | END>,
    connectionChannel: Channel<TargetConnection | -1>,
) {
    let task: Task | null = null;

    while (true) {
        const action: TargetSagaAction = yield take(channel);
        logger.verbose(`watchTarget: ${action.type}`);
        if (action.type === "started") {
            if (task && task.isRunning()) {
                task.cancel();
            }
            task = yield fork(
                spawnConnection,
                action.host,
                action.port,
                connectionChannel,
            );
        } else if (action.type === "stopped") {
            if (task) {
                task.cancel();
                task = null;
            }
            yield put(connectionChannel, -1);
            yield put<Action>({ type: "disconnect" });
        } else {
            throw new Error(`unknown action type ${action["type"]}`);
        }
    }
}

export function* targetFlow(
    target: Target,
    connectionChannel: Channel<TargetConnection | -1>,
) {
    logger.verbose("sagas: targetFlow");
    logger.verbose("created target");

    const channel = setupTarget(target);

    yield takeEvery<ActionType>("start", () => {
        logger.verbose("sagas: watchTargetRequests: start");
        target.start();
    });
    yield takeEvery<ActionType>("stop", () => {
        logger.verbose("sagas: watchTargetRequests: stop");
        target.stop();
    });
    yield takeEvery<ActionType>("restart", () => {
        logger.verbose("sagas: watchTargetRequests: restart");
        if (target.isRunning) {
            target.once("stopped", () => {
                target.start();
            });
            target.stop();
        } else {
            target.start();
        }
    });

    yield fork(watchTarget, channel, connectionChannel);
}