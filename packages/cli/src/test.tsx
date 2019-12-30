process.on("uncaughtException", e => {
    console.error(e.message);
    console.error(e.stack);
});

import React from "react";
import { render, Box, Terminal, Input } from "./renderer";

function Test(): JSX.Element {
    const [counter, setCounter] = React.useState(1);

    function inc(): void {
        setCounter(counter + 1);
    }

    return (
        <Box grow={1} direction="column">
            <Box>
                <Box justify="center" alignItems="center" grow={1}>
                    counter: {counter}
                </Box>
                <Box
                    justify="center"
                    alignItems="center"
                    grow={1}
                    onClick={inc}
                >
                    <Box>click </Box>to increment
                </Box>
            </Box>
            <Input />
            <Box wrap={true} grow={1} scrollable={true} direction="column">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Eget
                nunc scelerisque viverra mauris in aliquam sem fringilla ut.
                Porta lorem mollis aliquam ut. Mi in nulla posuere sollicitudin
                aliquam ultrices sagittis orci a. Volutpat odio facilisis mauris
                sit amet. Amet nisl suscipit adipiscing bibendum est. Nibh
                venenatis cras sed felis eget velit aliquet. Amet volutpat
                consequat mauris nunc congue. Pellentesque massa placerat duis
                ultricies lacus sed turpis tincidunt. Morbi tristique senectus
                et netus et malesuada. Eu nisl nunc mi ipsum faucibus vitae
                aliquet. Ac orci phasellus egestas tellus rutrum. Imperdiet dui
                accumsan sit amet nulla facilisi morbi. Diam vulputate ut
                pharetra sit amet aliquam. Senectus et netus et malesuada fames
                ac turpis egestas. Mi proin sed libero enim sed. Vitae ultricies
                leo integer malesuada nunc vel risus. Amet tellus cras
                adipiscing enim eu. Sed adipiscing diam donec adipiscing
                tristique risus nec. Vulputate mi sit amet mauris commodo quis
                imperdiet massa tincidunt. Risus pretium quam vulputate
                dignissim suspendisse in. Odio ut enim blandit volutpat maecenas
                volutpat blandit aliquam etiam. Id aliquet risus feugiat in ante
                metus dictum at. Est placerat in egestas erat imperdiet sed
                euismod nisi porta. Eu tincidunt tortor aliquam nulla facilisi.
                Malesuada nunc vel risus commodo viverra. Vestibulum mattis
                ullamcorper velit sed ullamcorper. Convallis a cras semper
                auctor neque vitae tempus quam pellentesque. Fames ac turpis
                egestas maecenas. Mattis pellentesque id nibh tortor. Vitae
                proin sagittis nisl rhoncus mattis rhoncus. Diam vel quam
                elementum pulvinar etiam non quam lacus. Nulla pellentesque
                dignissim enim sit amet venenatis. Eget duis at tellus at urna
                condimentum mattis pellentesque id. Vestibulum morbi blandit
                cursus risus at ultrices mi. Sed risus ultricies tristique nulla
                aliquet enim tortor at auctor. Mattis ullamcorper velit sed
                ullamcorper morbi tincidunt ornare. Commodo quis imperdiet massa
                tincidunt nunc pulvinar sapien et ligula. Pharetra convallis
                posuere morbi leo urna molestie. Id semper risus in hendrerit.
                Eu feugiat pretium nibh ipsum consequat nisl. Velit egestas dui
                id ornare arcu odio ut sem. Id diam vel quam elementum pulvinar.
                Diam ut venenatis tellus in metus. Fusce id velit ut tortor
                pretium viverra suspendisse. In tellus integer feugiat
                scelerisque varius. Vitae semper quis lectus nulla at volutpat
                diam ut. Aliquet risus feugiat in ante. Suscipit tellus mauris a
                diam maecenas sed enim ut sem. Diam sollicitudin tempor id eu
                nisl nunc mi ipsum faucibus. Sed egestas egestas fringilla
                phasellus faucibus scelerisque eleifend donec. Morbi leo urna
                molestie at. Vitae proin sagittis nisl rhoncus mattis rhoncus.
                Lectus nulla at volutpat diam ut venenatis tellus in. Sed enim
                ut sem viverra aliquet eget sit. Maecenas sed enim ut sem
                viverra aliquet. Lacus suspendisse faucibus interdum posuere
                lorem ipsum. Euismod elementum nisi quis eleifend quam
                adipiscing vitae proin. Etiam non quam lacus suspendisse
                faucibus interdum posuere. Congue eu consequat ac felis donec
                et. Magna fringilla urna porttitor rhoncus. Habitasse platea
                dictumst vestibulum rhoncus est pellentesque elit ullamcorper
                dignissim. A pellentesque sit amet porttitor eget. Arcu vitae
                elementum curabitur vitae nunc sed velit. Tristique sollicitudin
                nibh sit amet commodo nulla facilisi. Vitae auctor eu augue ut
                lectus arcu bibendum at. Lectus sit amet est placerat. Aenean
                pharetra magna ac placerat vestibulum lectus mauris ultrices.
                Risus viverra adipiscing at in. Ligula ullamcorper malesuada
                proin libero nunc consequat interdum varius sit. Pharetra
                convallis posuere morbi leo. Orci dapibus ultrices in iaculis
                nunc sed augue. Orci porta non pulvinar neque laoreet
                suspendisse. Ut tellus elementum sagittis vitae et leo.
                Adipiscing diam donec adipiscing tristique risus nec feugiat.
                Quisque sagittis purus sit amet volutpat. Ac orci phasellus
                egestas tellus rutrum tellus. Turpis massa sed elementum tempus
                egestas sed sed risus pretium. Lobortis feugiat vivamus at augue
                eget arcu dictum. At auctor urna nunc id cursus metus aliquam
                eleifend mi. Faucibus interdum posuere lorem ipsum dolor sit.
                Volutpat est velit egestas dui id ornare. Ut porttitor leo a
                diam sollicitudin tempor. Dui nunc mattis enim ut tellus
                elementum. Nullam eget felis eget nunc. Semper feugiat nibh sed
                pulvinar proin gravida hendrerit lectus. Faucibus pulvinar
                elementum integer enim neque volutpat ac. Cursus metus aliquam
                eleifend mi in nulla posuere sollicitudin. At tempor commodo
                ullamcorper a lacus vestibulum. Morbi non arcu risus quis
                varius. Netus et malesuada fames ac turpis egestas sed tempus.
                Aenean euismod elementum nisi quis eleifend quam adipiscing
                vitae. Eget dolor morbi non arcu risus quis varius quam. Aliquet
                enim tortor at auctor urna nunc. Turpis in eu mi bibendum neque
                egestas. Mattis ullamcorper velit sed ullamcorper morbi
                tincidunt ornare. Neque sodales ut etiam sit. Ridiculus mus
                mauris vitae ultricies leo. Purus sit amet volutpat consequat
                mauris. Quam quisque id diam vel quam. Tristique senectus et
                netus et malesuada fames ac turpis. Eget felis eget nunc
                lobortis mattis. Gravida dictum fusce ut placerat orci. Ipsum
                suspendisse ultrices gravida dictum fusce. Cursus vitae congue
                mauris rhoncus aenean vel elit scelerisque mauris. Purus sit
                amet volutpat consequat mauris nunc. Pharetra sit amet aliquam
                id diam maecenas. Pellentesque eu tincidunt tortor aliquam nulla
                facilisi cras fermentum odio. Nisl purus in mollis nunc sed id.
                In iaculis nunc sed augue lacus viverra vitae. Feugiat sed
                lectus vestibulum mattis ullamcorper velit sed ullamcorper
                morbi. Volutpat consequat mauris nunc congue. In eu mi bibendum
                neque egestas congue quisque egestas diam. Id aliquet lectus
                proin nibh nisl condimentum id venenatis. Fermentum dui faucibus
                in ornare. Sed risus pretium quam vulputate dignissim
                suspendisse in est. Justo nec ultrices dui sapien eget mi proin
                sed libero. Dictumst vestibulum rhoncus est pellentesque.
                Scelerisque viverra mauris in aliquam sem. Auctor augue mauris
                augue neque. Amet dictum sit amet justo donec enim diam
                vulputate ut. Tincidunt dui ut ornare lectus sit. Vitae aliquet
                nec ullamcorper sit amet risus nullam. Vulputate mi sit amet
                mauris. Varius vel pharetra vel turpis. Lectus urna duis
                convallis convallis tellus id interdum. Aliquam id diam maecenas
                ultricies. Elementum eu facilisis sed odio morbi quis commodo
                odio aenean. Id consectetur purus ut faucibus. Ipsum dolor sit
                amet consectetur adipiscing elit. Duis ut diam quam nulla
                porttitor massa id neque. Enim ut sem viverra aliquet eget sit
                amet. Proin nibh nisl condimentum id venenatis a condimentum
                vitae. Nunc aliquet bibendum enim facilisis gravida neque
                convallis. Duis at consectetur lorem donec massa sapien faucibus
                et. Lorem mollis aliquam ut porttitor leo. Mi eget mauris
                pharetra et ultrices. Euismod elementum nisi quis eleifend.
                Tellus cras adipiscing enim eu turpis egestas pretium aenean.
                Vitae sapien pellentesque habitant morbi. Mattis enim ut tellus
                elementum sagittis vitae.
            </Box>
            <Box height={5}>this is a footer</Box>
        </Box>
    );
}

render(<Test />, Terminal);
