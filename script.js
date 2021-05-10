// @ts-nocheck
'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; //in min
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
        return this.description;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        //km/h
        this.speed = this.distance / this.duration;
        return this.speed
    }
}

////////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        //load page
        this._getPosition()

        //load data from localStorage
        this._getLocalStorage();

        //handeling events
        form.addEventListener('submit', this._newWorkout.bind(this))
        inputType.addEventListener('change', this._toggleElevationField)
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your location.')
            })
        }
    }

    //receive position
    _loadMap(position) {
        const {
            latitude
        } = position.coords;
        const {
            longitude
        } = position.coords;

        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //handeling click event on map
        this.#map.on('click', this._showForm.bind(this));

        //render marker from localStorage workouts
        this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
    }

    //Click on map to show the form
    _showForm(mapE) {
        this.#mapEvent = mapE
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        //empty the inputs
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';

        //remove the animation of form
        form.style.display = 'none';
        //hide the form
        form.classList.add('hidden');

        //add the animation back after 1 second
        setTimeout(() => { form.style.display = 'grid' }, 1000)
    }

    //change input type
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    //handel submit
    _newWorkout(e) {
        e.preventDefault();

        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))
        const allPositive = (...inputs) => inputs.every(inp => inp > 0)

        //get data from form 
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        //if workout is running
        if (type === 'running') {
            const cadence = +inputCadence.value;

            //check if data is valid
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('Inputs have to be positive numbers!')

            // create running object
            workout = new Running([lat, lng], distance, duration, cadence)
        }

        //if workout is cycling
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            //check if data is valid
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration, elevation))
                return alert('Inputs have to be positive numbers!')

            // create cycling object
            workout = new Cycling([lat, lng], distance, duration, elevation)
        }

        //add new object to workout array
        this.#workouts.push(workout);

        //render workout array on map as marker
        this._renderWorkoutMarker(workout);

        //render workout array on list
        this._renderWorkout(workout);

        //hide form + clear input fields
        this._hideForm();

        //set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(`${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if (workout.type === 'running')
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;

        if (workout.type === 'cycling')
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
        form.insertAdjacentHTML('afterend', html)
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
        //using public interface
        //workout.click();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return

        this.#workouts = data;
        //render the workouts on the list
        this.#workouts.forEach(workout => this._renderWorkout(workout))
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();