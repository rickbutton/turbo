import React from "react";
import { Box } from "../renderer";

interface TitleProps {
    title: string;
    active: boolean;
    onClick(): void;
}
function Title(props: TitleProps): JSX.Element {
    return (
        <Box
            onClick={props.onClick}
            marginRight={1}
            color={props.active ? "red" : undefined}
        >
            {props.title}
        </Box>
    );
}

export function Tabs(props: React.PropsWithChildren<{}>): JSX.Element {
    const [current, setCurrent] = React.useState("");

    if (!props.children) {
        throw new Error();
    }

    const children = React.Children.toArray(props.children);

    const shown =
        children.find((c: any) => c.props.name === current) || children[0];

    return (
        <Box direction="column" grow={1}>
            <Box marginBottom={1} bg={"brightWhite"} color={"black"}>
                {children.map((c: any, i: number) => (
                    <Title
                        active={c === shown}
                        key={i}
                        title={c.props.title}
                        onClick={setCurrent.bind(null, c.props.title)}
                    />
                ))}
            </Box>
            {shown}
        </Box>
    );
}

interface TabProps {
    name: string;
    title: string;
}
export function Tab(props: React.PropsWithChildren<TabProps>): JSX.Element {
    return props.children as any;
}
