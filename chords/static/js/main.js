var Chords = function() {
    // Initialize the javascript to show the waveform in the bottom bar
    this.wavesurfer = Object.create(WaveSurfer);
    this.wavesurfer.init({container: '#waveform'});
    // When the transport passes a mark call the onMark function
    this.wavesurfer.on("mark", this.onMark.bind(this));

    // Call the onPlayButtonClick function when the play button is clicked
    this.playButton = $("#play-button");
    this.playIcon = $("#play-button i");
    this.playButton.click(this.onPlayButtonClicked.bind(this));
    this.playing = false;

    // Find the divs for the chord and beat display
    this.chordDiv = $("div#chord div div");
    this.beatDiv = $("div#beat");


    // When a song is click to load it call the onSongClicked function
    $("#songs").on("click", ".song",
                   this.onSongClicked.bind(this));
    // When the add song button is clicked call the onAddButtonClicked function
    $("#songs").on("click", "#add-button",
                   this.onAddButtonClicked.bind(this));

    // When the user selects a file call the onFileAdded function
    this.fileInput = $("#file-input");
    this.fileInput.change(this.onFileAdded.bind(this));

    this.uploadForm = $("#upload-form");

    this.songList = $("#song-list");
    // Compile the song list template from the HTML file
    this.songListTemplate = Handlebars.compile($("#song-list-template").html());

    this.songs = [];
    // Get the current list of uploaded songs
    this.getSongs();

    this.chords = null;
};

Chords.prototype.onSongClicked = function(event) {
    // Called when we load a new song
    this.pause();
    this.wavesurfer.clearMarks();
    var song = $(event.target);
    // Reload the waveform from the path data attribute
    this.wavesurfer.load(song.data("path"));

    // Call the analysis endpoint for the song
    var ajax = $.ajax('/api/songs/' + song.data('id') + '/analysis', {
        type: 'GET',
        dataType: 'json'
    });
    ajax.done(this.onGetAnalysisDone.bind(this));
    ajax.fail(this.onFail.bind(this, "Getting analysis"));
};


Chords.prototype.onGetAnalysisDone = function(data) {
    // Called when the data anlysis endpoint returns
    // Loop through the beats adding marks to the waveform view for each one
    var beats = data.beats;
    for (var i=0; i<beats.length; i++) {
        var beat = beats[i];
        if (beat == 0) {
            // Wavesurfer doesn't like marks at position 0, so continue
            continue;
        }

        var mark = this.wavesurfer.mark({
            position: beat,
            color: 'rgba(0, 255, 0, 0.5)'
        });
        // Add metadata to the mark
        mark.isChord = false;
        mark.isBeat = true;
    }


    // Loop through the beats adding marks to the waveform view for each one
    var chords = data.chords;
    for (var i=0; i<chords.length; i++) {
        var chord = chords[i];
        if (chord.time == 0) {
            // Wavesurfer doesn't like marks at position 0, so continue
            continue;
        }

        var mark = this.wavesurfer.mark({
            position: chord.time,
            color: 'rgba(255, 0, 0, 0.5)'
        });
        // Add metadata to the mark
        mark.isChord = true;
        mark.isBeat = false;
        mark.chord = chord.chord;
    }
};

Chords.prototype.onMark = function(mark) {
    // Called when the transport passes a mark
    if (mark.isBeat) {
        // If the mark is a beat change the beatDiv background color to
        // something psychadelic
        this.beatDiv.css("background-color",
                         "hsl(" + Math.random() * 255 + ", 100%, 50%)");
    }
    if (mark.isChord != null) {
        // If the mark is a chord then display the chord name in the chordDiv
        this.chordDiv.text(mark.chord);
    }
};

Chords.prototype.onPlayButtonClicked = function() {
    // Switch between play and pause
    if (this.playing) {
        this.pause();
    }
    else {
        this.play();
    }
};

Chords.prototype.togglePlayIcon = function() {
    // Toggle the play icon between play and pause
    this.playIcon.toggleClass("fa-play");
    this.playIcon.toggleClass("fa-pause");
};

Chords.prototype.play = function() {
    if (this.playing) {
        return;
    }
    // Start the song playing, and set the play icon
    this.wavesurfer.play();
    this.togglePlayIcon();
    this.playing = true;
};

Chords.prototype.pause = function() {
    if (!this.playing) {
        return;
    }
    // Pause the song, and set the pause icon
    this.wavesurfer.pause();
    this.togglePlayIcon();
    this.playing = false;
};

Chords.prototype.onAddButtonClicked = function() {
    // Fake a click on the file input so we can choose a song
    this.fileInput.click();
};

Chords.prototype.onFileAdded = function(event) {
    var file = this.fileInput[0].files[0];
    var name = file.name;
    var size = file.size;
    var type = file.type;

    // Create a FormData object from the upload form
    var data = new FormData(this.uploadForm[0]);
    // Make a POST request to the file upload endpoint
    var ajax = $.ajax('/api/files', {
        type: 'POST',
        xhr: this.createUploadXhr.bind(this),
        data: data,
        cache: false,
        contentType: false,
        processData: false,
        dataType: 'json'
    });
    ajax.done(this.onUploadDone.bind(this));
    ajax.fail(this.onFail.bind(this, "File upload"));
};

Chords.prototype.createUploadXhr = function() {
    // XHR file upload magic
    var xhr = new XMLHttpRequest();
    if(xhr.upload) { // if upload property exists
        xhr.upload.addEventListener('progress',
                                    this.onUploadProgress.bind(this), false);
    }
    return xhr;
};

Chords.prototype.onUploadDone = function(data) {
    // Called if the upload succeeds
    console.log("Uploading file succeeded");
    data = {
        file: {
            id: data.id
        }
    }
    // Make a POST request to add the song
    var ajax = $.ajax('/api/songs', {
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        dataType: 'json'
    });
    ajax.done(this.onAddSongDone.bind(this));
    ajax.fail(this.onFail.bind(this, "Adding song"));
};

Chords.prototype.onAddSongDone = function(data) {
    // Add the song to the songs array, and update the user interface
    this.songs.push(data);
    this.updateSongView();
};

Chords.prototype.onUploadProgress = function(event) {
};

Chords.prototype.getSongs = function() {
    // Make a get request to list all of the songs
    var ajax = $.ajax('/api/songs', {
        type: 'GET',
        dataType: 'json'
    });
    ajax.done(this.onGetSongsDone.bind(this));
    ajax.fail(this.onFail.bind(this, "Getting song information"));
};

Chords.prototype.onGetSongsDone = function(data) {
    // Update the songs array, and update the user interface
    this.songs = data;
    this.updateSongView();
};

Chords.prototype.updateSongView = function() {
    // Render the handlebars template for the song list, and insert it into
    // the DOM
    var context = {
        songs: this.songs
    };

    var songList = $(this.songListTemplate(context));
    this.songList.replaceWith(songList);
    this.songList = songList;
};

Chords.prototype.onFail = function(what, event) {
    // Called when an AJAX call fails
    console.error(what, "failed: ", event.statusText);
};

$(document).ready(function() {
    window.app = new Chords();
});
