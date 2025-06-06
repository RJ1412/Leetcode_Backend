import { getJudge0LanguageId, pollBatchResults, submitBatch } from "../libs/judge0.lib.js";
import { db } from "../libs/db.js";
export const createProblem = async (req, res) => {
    //going to get the all the data from body
    const { title, description, difficuilty, tags, examples, constraints, testcases, codeSnippets, referenceSolutions } = req.body;

    //check the user role that he is admin or not

    if (req.user.role !== "ADMIN") {
        return res.status(403).json({
            error: "You are not allowed to create a problem"
        })
    }

    try {
        for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
            const languageId = getJudge0LanguageId(language);

            if (!languageId) {
                return res.status(400).json({
                    error: `Language ${language} is not supported`
                })
            }

            const submissions = testcases.map(({ input, output }) => ({
                source_code: solutionCode,
                language_id: languageId,
                stdin: input,
                expected_output: output,
            }))



            console.log("Submissions: ");
            
            console.log(solutionCode);
            
            console.log("submissionResult: ");
            const submissionResults = await submitBatch(submissions)

            console.log(submissionResults);
            
            const tokens = submissionResults.map((res) => res.token);
            console.log("Tokens: ");
            
            console.log(tokens);
            
            const results = await pollBatchResults(tokens)
            console.log("Results: ");
            
            console.log(results);
            console.log("outside of loop");
            
            for (let i = 0; i < results.length; i++) {
                console.log(i);
                console.log("enter");
                
                console.log(`result : ${results[i]}`);
                
                const result = results[i];
                if (result.status.id !== 3) {
                    return res.status(400).json({
                        error: `Testcase ${i + 1} failed for language ${language}`
                    })
                }
            }

            const newProblem = await db.problem.create({
                data: {
                    title, description, difficuilty, tags, examples, constraints, testcases, codeSnippets, referenceSolutions, userId: req.user.id,
                }
            })

            console.log(newProblem);
            

            return res.status(201).json({
            success : true,
            message : "Problem created Successfully",
            problem :  newProblem
        });
        }

    } catch (error) {
        console.error(error);
        return res.status(401).json(
            {message : "Error creating problem"}
        )
        
        
    }
    //loop through  each reference solution for different language
    //for each language , create a new problem in the database with the corresponding solution


}

export const getAllProblems = async (req, res) => {
    try {
        const problems = await db.Problem.findMany()
        console.log(problems);
        
        if(!problems){
            console.log("No problems found");
            
            return res.status(404).json({
                error:"No problems Found"
            })
        }
        
        
        
        return res.status(201).json({
            success : true,
            message : "Problem fetched Successfully",
            problems
        });
    } catch (error) {
        console.log(error);
        
        console.error(error);
        return res.status(401).json(
            {message : "Error fetching problem"}
        )
        
    }
}

export const getProblemById = async (req, res) => {
    const {id} = req.params;

    try {
        const problem =  await db.Problem.findUnique(
            {
                where : {
                    id
                }
            }
        )

        if(!problem){
            return res.status.json({
                error:"Problem not found"
            })
        }

        return res.status(201).json({
            success: true,
            message: "Problem Fetched Successfully",
            problem
        })
    } catch (error) {
        console.error(error);
        return res.status(401).json(
            {message : "Error fetching problem by id"}
        ) 
    }
}


export const updateProblem = async (req, res) => {
    const { id } = req.params;
    const { title, description, difficulty, tags, examples, constraints, testcases, codeSnippets, referenceSolutions } = req.body;

    if (req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "You are not allowed to update a problem" });
    }

    try {
        const problem = await db.Problem.findUnique({ where: { id } });

        if (!problem) {
            return res.status(404).json({ error: "Problem not found" });
        }

        for (const [language, solutionCode] of Object.entries(referenceSolutions || {})) {
            const languageId = getJudge0LanguageId(language);

            if (!languageId) {
                return res.status(400).json({ error: `Language ${language} is not supported` });
            }

            const submissions = testcases.map(({ input, output }) => ({
                source_code: solutionCode,
                language_id: languageId,
                stdin: input,
                expected_output: output,
            }));

            console.log("Submission : ", submissions);
            console.log("Source Code: " , submissions.solutionCode);
            // console.log("new code" , source_code);
            
            
            

            const submissionResults = await submitBatch(submissions);
            const tokens = submissionResults.map(res => res.token);
            const results = await pollBatchResults(tokens);

            // console.log(`Submission Result  of language ${languageId}: ` ,submissionResults);
            console.log(results);
            
            
            
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status.id !== 3) {
                    return res.status(400).json({
                        error: `Testcase ${i + 1} failed for language ${language}`
                    });
                }
            }
        }

        const updatedProblem = await db.Problem.update({
            where: { id },
            data: {
                title,
                description,
                difficulty,
                tags,
                examples,
                constraints,
                testcases,
                codeSnippets,
                referenceSolutions,
                userId: req.user.id,
            }
        });

        return res.status(200).json({
            success: true,
            message: "Problem updated successfully",
            problem: updatedProblem
        });

    } catch (error) {
        console.error("UpdateProblem error:", error);
        return res.status(500).json({ message:  error.message });
    }
}

export const deleteProblem = async (req, res) => {
   

    try {
        const {id} = req.params;

        const problem = await db.Problem.findUnique(
            {
                where : {id}
            }
        )
        if(!problem){
            return res.status(404).json(
                {error:"Problem Not Found"}
            )
        }

        await db.Problem.delete({where : {id}})

        res.status(200).json({
            success: true,
            message:"Problem deleted Successfully",
        })
    } catch (error) {
        console.error(error);
        return res.status(401).json(
            {message : "Error while deleting the problem"}
        )
        
    }
}

export const getAllProblemsSolvedByUser = async (req, res) => {
    try {
        const problems = await db.Problem.findMany({
            where :{
                solvedBy:{
                    some:{
                        userId:req.user.id
                    }
                }
            },
            include:{
                solvedBy:{
                    where:{
                        userId:req.user.id
                    }
                }
            }
        })

        console.log(problems);
        
        res.status(200).json({
            success:true,
            message:"Problems fetched successfully",
            problems
        })
    } catch (error) {
         console.error(error);
        return res.status(401).json(
            {message : "Error while fetching the problem"}
        )
    }
}