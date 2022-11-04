//import Vide from './src'
//import svgSprite from './src/sprite/spriteFA.svg'

document.addEventListener('DOMContentLoaded', () => {
    const selector = '#player';

    // Setup the player
    const player = new Vide(selector, {
        controls: [
            'current-time',
            'duration',
            'progress',
            'play',
            'rewind',
            'play-large',
            'fast-forward',
            'mute',
            'volume',
            'brand',
            'pip',
            'cast',
            'captionsMenu',
            //'audioTracksMenu',
            'qualityMenu',
            'speedMenu',
            'settings',
            'airplay',
            //'download',
            'fullscreen',
            'title',
            'logo',
            'watchedBefore'
        ],
        clientLogo: 'http://localhost:3001/player-logo/1667331020743-257789047.png',
        toggleInvert: true,
        length: 183,
        iconUrl: '/src/sprite/spriteFA.svg',
        loadSprite: false,
        seekTime: 10,
        //debug: true,
        title: 'View From A Blue Moon',
        keyboard: {
            global: true,
        },
        captions: {
            active: true,
            languages: [{
                label: 'Test',
                srclang: 'al',
                src: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.en.vtt'
            }]
        },
        previewThumbnails: {
            enabled: true,
            //frames: preview,
            image: 'https://img-vh.doodcdn.co/slides/b152cb0c0e39e020.jpg',
            cells: 49,
            rows: 7,
            imageWidth: 0,
            imageHeight: 0
        },
        skipIntro: {
            enabled: true,
            seconds: 10
        },
        continueWatching: {
            enabled: true
        }
    })

    player.on('fontchange', (event) => {
        const captionsSize = player.storage.get('captionsSize') || 14
        //console.log(event, captionsSize)
    })

    // Expose for tinkering in the console
    window.player = player
})
