import courseModel from "../models/courseModel.js";

export const createCourse = async (req, res) => {
  try {
    const { title, fee } = req.body;
    if (!title || !fee) {
      return res.status(400).json({ message: 'Title and fee are required' });
    }

    const data = await courseModel.create({title, fee})
    res.status(201).json({ message: 'Course added successfully', data });

  } catch (error) {
    
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getAllCourses = async (req, res) => {
  try {
    const courses = await courseModel.find().sort({ created_at: -1 });
    res.json({message: 'Courses fetched', data: courses});
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCourse = async (req, res) => {
    const courseId = req.params.id;
    try {
        await courseModel.findByIdAndDelete(courseId);
        res.json({message: 'Course deleted successfully'})
    } catch (e) {
        res.status(500).json({message: 'Something went wrong'})
    }
}