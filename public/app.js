document.addEventListener('DOMContentLoaded', () => {

    // --- State and Constants ---
    const VIBES = ['Chill', 'Party', 'Sad', 'Motivational', 'Romantic', 'Travel', 'Festival', 'Aesthetic'];
    let imageBase64 = null;
    let imageSrc = null;
    let currentlyPlayingBtn = null;
    let starredSongs = JSON.parse(localStorage.getItem('starredSongs')) || [];
    let suggestionHistory = [];
    let currentPage = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    let isLocked = false;

    // --- DOM Elements ---
    const mainContainer = document.getElementById('main-container');
    const initialView = document.getElementById('initial-view');
    const mainContent = document.getElementById('main-content');
    const resuggestBtn = document.getElementById('resuggest-btn');
    const resetBtn = document.getElementById('reset-btn');
    const analysisText = document.getElementById('analysis-text');
    const suggestionsCarousel = document.getElementById('suggestions-carousel');
    const paginationDots = document.getElementById('pagination-dots');
    const starredList = document.getElementById('starred-list');
    const noStarredSongs = document.getElementById('no-starred-songs');
    const audioPlayer = document.getElementById('audio-player');
    const lockModal = document.getElementById('lock-modal');
    const modalYesBtn = document.getElementById('modal-yes-btn');
    const modalNoBtn = document.getElementById('modal-no-btn');
    
    // --- Clone and setup forms ---
    const formTemplate = document.getElementById('form-template');
    const initialFormContainer = document.getElementById('initial-form-container');
    const mainFormContainer = document.getElementById('main-form-container');
    
    initialFormContainer.appendChild(formTemplate.content.cloneNode(true));
    mainFormContainer.appendChild(formTemplate.content.cloneNode(true));
    const forms = [initialFormContainer, mainFormContainer];

    // --- Event Listeners and Setup ---
    setupForm(initialFormContainer, 'initial');
    setupForm(mainFormContainer, 'main');
    
    modalYesBtn.addEventListener('click', resetApp);
    modalNoBtn.addEventListener('click', () => lockModal.classList.add('hidden'));

    resuggestBtn.addEventListener('click', () => {
        if (resuggestBtn.disabled) return;
        resuggestBtn.classList.add('clicked');
        resuggestBtn.querySelector('span').classList.add('hidden');
        resuggestBtn.querySelector('.button-loader').classList.remove('hidden');
        setTimeout(() => resuggestBtn.classList.remove('clicked'), 300);
        getSongSuggestion(true);
    });

    resetBtn.addEventListener('click', resetApp);

    suggestionsCarousel.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    suggestionsCarousel.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    renderStarredSongs();

    // --- Helper Functions ---

    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            if (currentPage < suggestionHistory.length - 1) navigateToPage(currentPage + 1);
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            if (currentPage > 0) navigateToPage(currentPage - 1);
        }
    }
    
    function showLockModal() {
        lockModal.classList.remove('hidden');
    }

    function setupForm(formElement, formId) {
        const dropZone = formElement.querySelector('.drop-zone');
        const fileInput = formElement.querySelector('.file-input');
        const suggestBtn = formElement.querySelector('.suggest-btn');
        
        // Vibe buttons setup
        const vibeSelector = formElement.querySelector('.vibe-selector');
        if (vibeSelector) {
            vibeSelector.innerHTML = '';
            VIBES.forEach(vibe => {
                const btn = document.createElement('button');
                btn.textContent = vibe;
                btn.dataset.vibe = vibe;
                btn.className = 'vibe-btn bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 px-2 rounded-lg text-sm';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (formId === 'main' && isLocked) {
                        showLockModal();
                        return;
                    }
                    const isSelected = btn.classList.contains('selected');
                    document.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('selected'));
                    if (!isSelected) {
                       document.querySelectorAll(`.vibe-btn[data-vibe="${vibe}"]`).forEach(b => b.classList.add('selected'));
                    }
                });
                vibeSelector.appendChild(btn);
            });
        }
        
        // Era buttons setup
        const eraBtns = formElement.querySelectorAll('.era-btn');
        eraBtns.forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                if (formId === 'main' && isLocked) {
                    showLockModal();
                    return;
                }
                const selectedEra = btn.dataset.era;
                document.querySelectorAll('.song-era-selector').forEach(selector => {
                    selector.querySelectorAll('.era-btn').forEach(b => {
                        b.classList.toggle('selected', b.dataset.era === selectedEra);
                    });
                });
            });
        });
        
        if (formId === 'main') {
            const lockHandler = (e) => {
                if (isLocked) {
                    e.preventDefault();
                    e.target.blur();
                    showLockModal();
                }
            };
            formElement.querySelector('.language-select').addEventListener('mousedown', lockHandler);
            formElement.querySelector('.genre-input').addEventListener('focus', lockHandler);
            formElement.querySelector('.prompt-input').addEventListener('focus', lockHandler);
        }

        const handleFile = (file) => {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imageBase64 = e.target.result.split(',')[1];
                    imageSrc = e.target.result;
                    document.querySelectorAll('.image-preview').forEach(img => {
                        img.src = imageSrc;
                        img.classList.remove('hidden');
                    });
                    document.querySelectorAll('.upload-prompt').forEach(prompt => prompt.classList.add('hidden'));
                    document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
                };
                reader.readAsDataURL(file);
            } else {
                displayError('Please upload a valid image file.');
            }
        };

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });
        document.addEventListener('paste', (e) => {
            const file = Array.from(e.clipboardData.items).find(item => item.type.includes("image"))?.getAsFile();
            if(file) handleFile(file);
        });

        suggestBtn.addEventListener('click', () => getSongSuggestion(false));
    }
    
    function setLoadingState(isLoading) {
         forms.forEach(form => {
            const suggestBtn = form.querySelector('.suggest-btn');
            const buttonText = form.querySelector('.button-text');
            const buttonLoader = form.querySelector('.button-loader');
            if (suggestBtn) {
                suggestBtn.disabled = isLoading;
                buttonText.classList.toggle('hidden', isLoading);
                buttonLoader.classList.toggle('hidden', !isLoading);
            }
        });
        resuggestBtn.disabled = isLoading;
        if(!isLoading){
            resuggestBtn.querySelector('span').classList.remove('hidden');
            resuggestBtn.querySelector('.button-loader').classList.add('hidden');
        }
    }

    function displayError(message) {
        setLoadingState(false);
        forms.forEach(form => {
            const errorMessage = form.querySelector('.error-message');
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        });
    }
    
    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    function resetApp() {
        initialView.classList.remove('hidden');
        mainContent.classList.add('hidden');
        mainContainer.classList.add('max-w-2xl');
        mainContainer.classList.remove('max-w-7xl');
        imageBase64 = null;
        imageSrc = null;
        suggestionHistory = [];
        currentPage = 0;
        isLocked = false;
        lockModal.classList.add('hidden');
        suggestionsCarousel.innerHTML = '';
        paginationDots.innerHTML = '';
        analysisText.textContent = '';
        forms.forEach(form => {
            form.querySelector('.image-preview').classList.add('hidden');
            form.querySelector('.upload-prompt').classList.remove('hidden');
            form.querySelector('.prompt-input').value = '';
            form.querySelector('.genre-input').value = '';
            form.querySelector('.file-input').value = '';
            form.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('selected'));
        });
    }

    async function togglePlay(btn, song) {
        if (currentlyPlayingBtn === btn) {
            audioPlayer.pause();
        } else {
            if (currentlyPlayingBtn) currentlyPlayingBtn.innerHTML = playIconSVG();
            currentlyPlayingBtn = btn;
            btn.innerHTML = loadingIconSVG();
            try {
                // Using iTunes search API to get a preview clip of the song
                const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(song.songTitle + " " + song.artist)}&entity=song&limit=1`);
                const data = await response.json();
                if (data.results[0]?.previewUrl) {
                    audioPlayer.src = data.results[0].previewUrl;
                    audioPlayer.play();
                    btn.innerHTML = pauseIconSVG();
                } else throw new Error("No preview available");
            } catch (error) {
                btn.innerHTML = playIconSVG();
                btn.disabled = true;
                currentlyPlayingBtn = null;
                showToast("Preview not available for this song.");
            }
        }
    }
    
    // --- Icons ---
    const playIconSVG = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    const pauseIconSVG = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    const loadingIconSVG = () => `<svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    const shareSVG = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>`;

    // --- Core Logic: Rendering ---

    function addNewSuggestionPage(data) {
        suggestionHistory.push(data);
        analysisText.textContent = data.imageAnalysis;

        const songPage = document.createElement('div');
        songPage.className = 'song-page space-y-4 px-2';

        const reelIdeaContainer = document.createElement('div');
        reelIdeaContainer.className = 'bg-gray-900/50 p-4 rounded-lg text-left animate-fade-in mb-4 border border-gray-700';
        reelIdeaContainer.innerHTML = `
            <h3 class="text-md font-semibold text-indigo-300 mb-2 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>Reel Idea ✨</h3>
            <p class="text-sm text-gray-300 mb-2"><strong>Caption:</strong> <span class="caption-text italic">"${data.caption}"</span></p>
            <p class="text-xs text-gray-400"><strong>Hashtags:</strong> <span class="hashtags-text">${data.hashtags}</span></p>
        `;
        songPage.appendChild(reelIdeaContainer);

        data.songs.forEach(song => {
            const songId = song.songTitle + song.artist;
            const isStarred = starredSongs.some(s => s.id === songId);
            const songCard = document.createElement('div');
            songCard.className = 'song-card bg-gray-700/50 p-4 rounded-lg flex items-center justify-between animate-fade-in';
            songCard.innerHTML = `
                <div class="overflow-hidden mr-3 flex-grow">
                    <h4 class="font-bold text-white truncate">${song.songTitle}</h4>
                    <p class="text-sm text-gray-400 truncate">${song.artist}</p>
                    <p class="text-xs text-gray-500 italic truncate mt-1">"${song.lyricSnippet || ''}"</p>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0">
                    <button class="star-btn p-2 rounded-full hover:bg-gray-600 ${isStarred ? 'starred' : ''}" title="Star song" data-song-id="${songId}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </button>
                    <button class="play-btn w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 transition">${playIconSVG()}</button>
                </div>
            `;
            songCard.querySelector('.play-btn').addEventListener('click', (e) => togglePlay(e.currentTarget, song));
            songCard.querySelector('.star-btn').addEventListener('click', (e) => toggleStar(song, imageSrc, e.currentTarget));
            songPage.appendChild(songCard);
        });
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2';
        shareBtn.innerHTML = `${shareSVG()}<span>Share Vibe</span>`;
        shareBtn.addEventListener('click', () => sharePlaylist(data));
        songPage.appendChild(shareBtn);

        suggestionsCarousel.appendChild(songPage);
        updatePaginationDots();
        navigateToPage(suggestionHistory.length - 1);
    }

    function toggleStar(songData, imageSrc, starBtn) {
         const songId = songData.songTitle + songData.artist;
        const existingIndex = starredSongs.findIndex(s => (s.songTitle + s.artist) === songId);
        if (existingIndex > -1) {
            starredSongs.splice(existingIndex, 1);
        } else {
            starredSongs.push({ ...songData, imageSrc, id: songId });
        }
        localStorage.setItem('starredSongs', JSON.stringify(starredSongs));
        renderStarredSongs();
        updateAllStarButtons();
    }

    function updateAllStarButtons() {
        document.querySelectorAll('.star-btn').forEach(btn => {
            btn.classList.toggle('starred', starredSongs.some(s => s.id === btn.dataset.songId));
        });
    }

    function renderStarredSongs() {
         starredList.innerHTML = '';
        noStarredSongs.classList.toggle('hidden', starredSongs.length > 0);
        if (starredSongs.length > 0) {
            starredSongs.forEach(song => {
                const card = document.createElement('div');
                card.className = 'bg-gray-700/50 p-3 rounded-lg flex items-center justify-between animate-fade-in';
                card.innerHTML = `
                    <div class="flex items-center overflow-hidden">
                        <img src="${song.imageSrc}" class="w-12 h-12 rounded-md object-cover mr-4">
                        <div class="overflow-hidden">
                            <h4 class="font-bold text-white truncate text-sm">${song.songTitle}</h4>
                            <p class="text-xs text-gray-400 truncate">${song.artist}</p>
                        </div>
                    </div>
                    <button class="remove-star-btn flex-shrink-0 text-gray-400 hover:text-red-400 transition" title="Remove from starred">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    </button>
                `;
                card.querySelector('.remove-star-btn').addEventListener('click', () => {
                    starredSongs = starredSongs.filter(s => s.id !== song.id);
                    localStorage.setItem('starredSongs', JSON.stringify(starredSongs));
                    renderStarredSongs();
                    updateAllStarButtons();
                });
                starredList.appendChild(card);
            });
        }
    }

    function updatePaginationDots() {
        paginationDots.innerHTML = '';
        if (suggestionHistory.length <= 1) return;
        suggestionHistory.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'pagination-dot';
            dot.classList.toggle('active', index === currentPage);
            dot.addEventListener('click', () => navigateToPage(index));
            paginationDots.appendChild(dot);
        });
    }

    function navigateToPage(index) {
        currentPage = index;
        suggestionsCarousel.scrollTo({ left: index * suggestionsCarousel.offsetWidth, behavior: 'smooth' });
        updatePaginationDots();
    }

    async function sharePlaylist(data) {
        if (!data || !data.songs || !Array.isArray(data.songs) || !data.caption || !data.hashtags) {
            showToast('Could not share. Data is missing.');
            return;
        }

        let shareText = `Vibe check for my photo! 📸✨\n\n`;
        shareText += `AI Caption: "${data.caption}"\n\n`;
        shareText += `My Playlist:\n`;
        data.songs.forEach((song, index) => {
            shareText += `${index + 1}. ${song.songTitle} - ${song.artist}\n`;
        });
        shareText += `\n${data.hashtags}\n\nGenerated by Musical Muse`;
        
        try {
            if (!navigator.share) throw new Error("Share API not supported.");
            await navigator.share({ title: 'My Photo Vibe Playlist', text: shareText });
        } catch (error) {
            const textArea = document.createElement("textarea");
            textArea.value = shareText;
            textArea.style.position = "fixed";
            textArea.style.top = "-9999px";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                if (document.execCommand('copy')) showToast('Share failed. Playlist copied instead!');
                else showToast('Could not copy text.');
            } catch (err) {
                showToast('Could not copy text.');
            }
            document.body.removeChild(textArea);
        }
    }

    // --- Main Logic: Talking to the API ---

    async function getSongSuggestion(isResuggest) {
        if (!imageBase64) {
            displayError('Please upload an image first.');
            return;
        }
        
        setLoadingState(true);
        document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));

        // Gather all inputs to send to the server
        const form = isResuggest ? mainFormContainer : initialFormContainer;
        const selectedVibeBtn = form.querySelector('.vibe-btn.selected');
        const vibe = selectedVibeBtn ? selectedVibeBtn.dataset.vibe : '';
        const language = form.querySelector('.language-select').value;
        const genre = form.querySelector('.genre-input').value;
        const selectedEra = form.querySelector('.era-btn.selected').dataset.era;
        const promptVal = form.querySelector('.prompt-input').value;

        // Build a list of songs to avoid so we don't get duplicates
        let avoidSongs = "";
        const allPreviousSongs = suggestionHistory.flatMap(s => s.songs);
        const songsToAvoidList = [...starredSongs, ...allPreviousSongs];
        const uniqueTitles = [...new Set(songsToAvoidList.map(s => `${s.songTitle} by ${s.artist}`))];
        if (uniqueTitles.length > 0) {
            avoidSongs = uniqueTitles.join(', ');
        }

        try {
            // CALL OUR BACKEND, NOT GOOGLE DIRECTLY
            // This prevents the CORS error
            const response = await fetch('/api/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64,
                    vibe,
                    language,
                    genre,
                    era: selectedEra,
                    userPrompt: promptVal,
                    avoidSongs
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch suggestions');
            }

            const data = await response.json();

            // If we are getting the first suggestion, switch the view
            if (!isResuggest) {
               initialView.classList.add('hidden');
               mainContent.classList.remove('hidden');
               mainContainer.classList.remove('max-w-2xl');
               mainContainer.classList.add('max-w-7xl');
               isLocked = true;
               
               // Sync inputs between the two forms so they match
               const initialVibeBtn = initialFormContainer.querySelector('.vibe-btn.selected');
               if(initialVibeBtn) {
                   const mainVibeBtn = mainFormContainer.querySelector(`.vibe-btn[data-vibe="${initialVibeBtn.dataset.vibe}"]`);
                   if (mainVibeBtn) mainVibeBtn.classList.add('selected');
               }
               mainFormContainer.querySelector('.language-select').value = initialFormContainer.querySelector('.language-select').value;
               mainFormContainer.querySelector('.genre-input').value = initialFormContainer.querySelector('.genre-input').value;
               mainFormContainer.querySelector('.prompt-input').value = initialFormContainer.querySelector('.prompt-input').value;
               const initialEra = initialFormContainer.querySelector('.era-btn.selected').dataset.era;
               document.querySelectorAll('#main-form-container .era-btn').forEach(b => {
                    b.classList.toggle('selected', b.dataset.era === initialEra);
               });
            }

            if (data.songs && data.songs.length > 0) {
                addNewSuggestionPage(data);
            } else {
               throw new Error("AI returned no songs.");
            }

        } catch (error) {
            console.error("Suggestion Error:", error);
            displayError(error.message || 'An unexpected error occurred.');
        } finally {
            setLoadingState(false);
        }
    }
});