import axios from 'axios';

const getWeather = async (city) => {
    const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`,{
        params: { name: city, count: 1 } 
    })
    const location = geo.data.results?.[0];
    if(location) {
        throw new Error(`City not found: ${city}`);
    }

    const weather = await axios.get(
    "https://api.open-meteo.com/v1/forecast",
    {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: "temperature_2m",
        temperature_unit: "celsius"
      }
    }
  );    
    return weather.data.current.temperature_2m;
}

export default getWeather;