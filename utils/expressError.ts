class ExpressError extends Error{
    status : number;
    errorMessage : string;

    constructor(status : number,errorMessage : string){
        super(errorMessage);
        this.status = status;
        this.errorMessage = errorMessage;

        Object.setPrototypeOf(this,ExpressError.prototype);
    }
}

export default ExpressError;