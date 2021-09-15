import * as icons from '../icons.js';

let playbackToolbarButtons = [
    // {
    //     id: "rate",
    //     svg: icons.rate,
    //     label: "Rate",
    //     events: {
    //         click: () => console.log("adjust playback speed")
    //     }
    // },
    {
        id: "volume",
        svg: icons.volume,
        label: "Volume",
        events: {
            click: () => console.log("adjust the volume")
        }
    },
    {
        id: "prev-phrase",
        svg: icons.prevPhrase,
        label: "Previous phrase",
        events: {
            click: () => console.log("go to previous phrase")
        }
    },
    {
        id: "playpause",
        svg: `${icons.play}${icons.pause}`,
        label: "Play/pause",
        events: {
            click: e => {
                // simulate icon state toggle
                let tb = document.querySelector("#playback-toolbar");
                if (tb.classList.contains("is-playing")) {
                    tb.classList.remove("is-playing");
                }   
                else {
                    tb.classList.add("is-playing");
                }
            }
        }
    },
    {
        id: "next-phrase",
        svg: icons.nextPhrase,
        label: "Next phrase",
        events: {
            click: () => console.log("go to next phrase")
        }
    }
    
];

function setupPlayback(smilHref) {

}

export { setupPlayback };