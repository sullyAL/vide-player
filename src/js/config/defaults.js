import sprite from './../../sprite/sprite.svg'

const defaults = {
    // Disable
    enabled: true,

    // Custom media title
    title: '',

    // Logging to console
    debug: false,

    // Auto play (if supported)
    autoplay: false,

    // Only allow one media playing at once (vimeo only)
    autopause: true,

    // Allow inline playback on iOS (this effects YouTube/Vimeo - HTML5 requires the attribute present)
    // TODO: Remove iosNative fullscreen option in favour of this (logic needs work)
    playsinline: true,

    // Default time to skip when rewind/fast forward
    seekTime: 10,

    // Default volume
    volume: 1,
    muted: false,

    // Pass a custom duration
    duration: null,

    // Display the media duration on load in the current time position
    // If you have opted to display both duration and currentTime, this is ignored
    displayDuration: true,

    // Invert the current time to be a countdown
    invertTime: true,

    // Clicking the currentTime inverts it's value to show time left rather than elapsed
    toggleInvert: true,

    // Force an aspect ratio
    // The format must be `'w:h'` (e.g. `'16:9'`)
    ratio: null,

    // Playlist
    playlist: {
        enabled: false,
        list: [],
        onChange: null
    },
    isHLS: false,

    // Click video container to play/pause
    clickToPlay: true,

    // Auto hide the controls
    hideControls: true,

    // Reset to start when playback ended
    resetOnEnd: false,

    // Disable the standard context menu
    disableContextMenu: true,

    // Sprite (for icons)
    loadSprite: true,
    iconPrefix: 'vide',
    iconUrl: sprite,

    // Audio tracks
    audioTracks: {
        default: 0,
        options: [],
        onChange: () => { console.log('Audio change') },
    },

    // Blank video (used to prevent errors on source change)
    blankVideo: 'https://cdn.vide.io/static/blank.mp4',

    // Quality default
    quality: {
        default: 720,
        // The options to display in the UI, if available for the source media
        options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240],
        forced: false,
        onChange: null,
    },

    // Set loops
    loop: {
        active: false,
        // start: null,
        // end: null,
    },

    // Speed default and options to display
    speed: {
        selected: 1,
        // The options to display in the UI, if available for the source media (e.g. Vimeo and YouTube only support 0.5x-4x)
        options: [0.5, 0.75, 1, 1.25, 1.5],
    },

    // Keyboard shortcut settings
    keyboard: {
        focused: true,
        global: false,
    },

    // Display tooltips
    tooltips: {
        controls: false,
        seek: true,
    },

    // Captions settings
    captions: {
        active: false,
        language: 'auto',
        // Listen to new tracks added after vide is initialized.
        // This is needed for streaming captions, but may result in unselectable options
        update: false,
        upload: true
    },

    // Fullscreen settings
    fullscreen: {
        enabled: true, // Allow fullscreen?
        fallback: true, // Fallback using full viewport/window
        iosNative: false, // Use the native fullscreen in iOS (disables custom controls)
        // Selector for the fullscreen container so contextual / non-player content can remain visible in fullscreen mode
        // Non-ancestors of the player element will be ignored
        // container: null, // defaults to the player element
    },

    // Continue watching feature
    continueWatching: {
        enabled: false
    },

    // Skip intro
    skipIntro: {
        enabled: false,
        seconds: 0
    },

    // Local storage
    storage: {
        enabled: true,
        key: 'vide',
    },

    // Default controls
    controls: [
        'play-large',
        // 'restart',
        // 'rewind',
        'play',
        // 'fast-forward',
        'progress',
        'current-time',
        // 'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        // 'download',
        'fullscreen',
    ],
    code: '',
    settings: ['loop', 'options'],
    captionsMenu: ['captions', 'audioTracks'],
    audioTracksMenu: ['audioTracks'],
    qualityMenu: ['quality'],
    speedMenu: ['speed'],

    // Localisation
    i18n: {
        restart: 'Restart',
        rewind: 'Rewind {seektime}s',
        play: 'Play',
        pause: 'Pause',
        fastForward: 'Forward {seektime}s',
        seek: 'Seek',
        seekLabel: '{currentTime} of {duration}',
        played: 'Played',
        buffered: 'Buffered',
        currentTime: 'Current time',
        duration: 'Duration',
        volume: 'Volume',
        mute: 'Mute',
        unmute: 'Unmute',
        enableCaptions: 'Enable captions',
        disableCaptions: 'Disable captions',
        download: 'Download',
        enterFullscreen: 'Enter fullscreen',
        exitFullscreen: 'Exit fullscreen',
        frameTitle: 'Player for {title}',
        captions: 'Captions',
        audioTracks: 'Audio tracks',
        settings: 'Settings',
        pip: 'PIP',
        menuBack: 'Go back to previous menu',
        speed: 'Speed',
        normal: 'Normal',
        quality: 'Quality',
        loop: 'Loop',
        start: 'Start',
        end: 'End',
        all: 'All',
        reset: 'Reset',
        disabled: 'Disabled',
        enabled: 'Enabled',
        advertisement: 'Ad',
        qualityBadge: {
            2160: '4K',
            1440: '2K',
            1080: 'FHD',
            720: 'HD',
            480: 'SD',
        },
    },

    // URLs
    urls: {
        download: null,
        vimeo: {
            sdk: 'https://player.vimeo.com/api/player.js',
            iframe: 'https://player.vimeo.com/video/{0}?{1}',
            api: 'https://vimeo.com/api/oembed.json?url={0}',
        },
        youtube: {
            sdk: 'https://www.youtube.com/iframe_api',
            api: 'https://noembed.com/embed?url=https://www.youtube.com/watch?v={0}',
        },
        googleIMA: {
            sdk: 'https://imasdk.googleapis.com/js/sdkloader/ima3.js',
        },
        brand: '/'
    },

    // Custom control listeners
    listeners: {
        seek: null,
        play: null,
        pause: null,
        restart: null,
        rewind: null,
        fastForward: null,
        mute: null,
        volume: null,
        captions: null,
        audioTracks: null,
        download: null,
        fullscreen: null,
        pip: null,
        airplay: null,
        speed: null,
        quality: null,
        loop: null,
        language: null,
    },

    // Events to watch and bubble
    events: [
        // Events to watch on HTML5 media elements and bubble
        // https://developer.mozilla.org/en/docs/Web/Guide/Events/Media_events
        'ended',
        'progress',
        'stalled',
        'playing',
        'waiting',
        'canplay',
        'canplaythrough',
        'loadstart',
        'loadeddata',
        'loadedmetadata',
        'timeupdate',
        'volumechange',
        'play',
        'pause',
        'error',
        'seeking',
        'seeked',
        'emptied',
        'ratechange',
        'cuechange',

        // Custom events
        'download',
        'enterfullscreen',
        'exitfullscreen',
        'captionsenabled',
        'captionsdisabled',
        'languagechange',
        'controlshidden',
        'controlsshown',
        'fontchange',
        'ready',

        // YouTube
        'statechange',

        // Quality
        'qualitychange',

        // Audio
        'audioChange',

        // Ads
        'adsloaded',
        'adscontentpause',
        'adscontentresume',
        'adstarted',
        'adsmidpoint',
        'adscomplete',
        'adsallcomplete',
        'adsimpression',
        'adsclick',
    ],

    // Selectors
    // Change these to match your template if using custom HTML
    selectors: {
        editable: 'input, textarea, select, [contenteditable]',
        container: '.vide',
        controls: {
            container: null,
            wrapper: '.vide__controls',
            top: '.vide__controls--top',
            bottom: '.vide__controls--bottom'
        },
        labels: '[data-vide]',
        buttons: {
            play: '[data-vide="play"]',
            pause: '[data-vide="pause"]',
            restart: '[data-vide="restart"]',
            rewind: '[data-vide="rewind"]',
            fastForward: '[data-vide="fast-forward"]',
            mute: '[data-vide="mute"]',
            captions: '[data-vide="captions"]',
            download: '[data-vide="download"]',
            brand: '[data-vide="brand"]',
            fullscreen: '[data-vide="fullscreen"]',
            pip: '[data-vide="pip"]',
            airplay: '[data-vide="airplay"]',
            settings: '[data-vide="settings"]',
            speedMenu: '[data-vide="speed-menu"]',
            qualityMenu: '[data-vide="quality-menu"]',
            audioTracksMenu: '[data-vide="audio-tracks-menu-menu"]',
            audioTracks: '[data-vide="audio-tracks"]',
            captionsMenu: '[data-vide="captions-menu-menu"]',
            loop: '[data-vide="loop"]',
            backwardLarge: '[data-vide="backward-large"]',
            forwardLarge: '[data-vide="forward-large"]',
            skipButton: '[data-vide="skipButton"]'
        },
        inputs: {
            seek: '[data-vide="seek"]',
            volume: '[data-vide="volume"]',
            speed: '[data-vide="speed"]',
            language: '[data-vide="language"]',
            quality: '[data-vide="quality"]',
            audioTracks: '[data-vide="audio-tracks"]',
        },
        display: {
            invertedTime: '.vide__time--inverted',
            currentTime: '.vide__time--current',
            duration: '.vide__time--duration',
            buffer: '.vide__progress__buffer',
            loop: '.vide__progress__loop', // Used later
            volume: '.vide__volume--display',
        },
        progress: '.vide__progress',
        captions: '.vide__captions',
        audioTracks: '.vide__audioTracks',
        caption: '.vide__caption',
    },

    // Class hooks added to the player in different states
    classNames: {
        type: 'vide--{0}',
        provider: 'vide--{0}',
        video: 'vide__video-wrapper',
        embed: 'vide__video-embed',
        videoFixedRatio: 'vide__video-wrapper--fixed-ratio',
        embedContainer: 'vide__video-embed__container',
        poster: 'vide__poster',
        posterEnabled: 'vide__poster-enabled',
        ads: 'vide__ads',
        control: 'vide__control',
        controlPressed: 'vide__control--pressed',
        playing: 'vide--playing',
        paused: 'vide--paused',
        stopped: 'vide--stopped',
        loading: 'vide--loading',
        hover: 'vide--hover',
        tooltip: 'vide__tooltip',
        cues: 'vide__cues',
        marker: 'vide__progress__marker',
        hidden: 'vide__sr-only',
        hideControls: 'vide--hide-controls',
        isIos: 'vide--is-ios',
        isTouch: 'vide--is-touch',
        uiSupported: 'vide--full-ui',
        noTransition: 'vide--no-transition',
        display: {
            time: 'vide__time',
        },
        menu: {
            value: 'vide__menu__value',
            badge: 'vide__badge',
            open: 'vide--menu-open',
        },
        captions: {
            enabled: 'vide--captions-enabled',
            active: 'vide--captions-active',
        },
        fullscreen: {
            enabled: 'vide--fullscreen-enabled',
            fallback: 'vide--fullscreen-fallback',
        },
        pip: {
            supported: 'vide--pip-supported',
            active: 'vide--pip-active',
        },
        airplay: {
            supported: 'vide--airplay-supported',
            active: 'vide--airplay-active',
        },
        tabFocus: 'vide__tab-focus',
        previewThumbnails: {
            // Tooltip thumbs
            thumbContainer: 'vide__preview-thumb',
            thumbContainerShown: 'vide__preview-thumb--is-shown',
            imageContainer: 'vide__preview-thumb__image-container',
            timeContainer: 'vide__preview-thumb__time-container',
            // Scrubbing
            scrubbingContainer: 'vide__preview-scrubbing',
            scrubbingContainerShown: 'vide__preview-scrubbing--is-shown',
        },
    },

    // Embed attributes
    attributes: {
        embed: {
            provider: 'data-vide-provider',
            id: 'data-vide-embed-id',
            hash: 'data-vide-embed-hash',
        },
    },

    // Advertisements plugin
    // Register for an account here: http://vi.ai/publisher-video-monetization/?aid=videio
    ads: {
        enabled: false,
        publisherId: '',
        tagUrl: '',
    },

    // Preview Thumbnails plugin
    previewThumbnails: {
        enabled: false,
        src: '',
        imageWidth: 1000,
        cells: 49,
        imageHeight: 560,
        rows: 7
    },

    // Cast plugin
    cast: {
        enabled: true
    },

    // Vimeo plugin
    vimeo: {
        byline: false,
        portrait: false,
        title: false,
        speed: true,
        transparent: false,
        // Custom settings from vide
        customControls: true,
        referrerPolicy: null, // https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/referrerPolicy
        // Whether the owner of the video has a Pro or Business account
        // (which allows us to properly hide controls without CSS hacks, etc)
        premium: false,
    },

    // YouTube plugin
    youtube: {
        rel: 0, // No related vids
        showinfo: 0, // Hide info
        iv_load_policy: 3, // Hide annotations
        modestbranding: 1, // Hide logos as much as possible (they still show one in the corner when paused)
        // Custom settings from vide
        customControls: true,
        noCookie: false, // Whether to use an alternative version of YouTube without cookies
    },

    // Media Metadata
    mediaMetadata: {
        title: '',
        artist: '',
        album: '',
        artwork: [],
    },

    // Markers
    markers: {
        enabled: false,
        points: [],
    },
};

export default defaults;
