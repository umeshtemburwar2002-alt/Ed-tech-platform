fetch("http://localhost:4000/api/v1/course/getAllCourses")
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
