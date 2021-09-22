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
        id: "p4w-volume",
        svg: icons.volume,
        label: "Volume",
        events: {
            click: () => console.log("adjust the volume")
        }
    },
    {
        id: "p4w-prev-phrase",
        svg: icons.prevPhrase,
        label: "Previous phrase",
        events: {
            click: () => console.log("go to previous phrase")
        }
    },
    {
        id: "p4w-playpause",
        svg: `${icons.play}${icons.pause}`,
        label: "Play/pause",
        events: {
            click: e => {
                // simulate icon state toggle
                let tb = document.querySelector("#p4w-playback-toolbar");
                if (tb.classList.contains("p4w-is-playing")) {
                    tb.classList.remove("p4w-is-playing");
                }   
                else {
                    tb.classList.add("p4w-is-playing");
                }
            }
        }
    },
    {
        id: "p4w-next-phrase",
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