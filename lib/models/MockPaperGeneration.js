import mongoose from "mongoose";

const { Schema } = mongoose;

const mockPaperGenerationSchema = new Schema(
  {
    generationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourcePaper: {
      type: Schema.Types.ObjectId,
      ref: "Paper",
      required: false,
      index: true,
    },
    mockPaperJson: {
      type: Schema.Types.Mixed,
      required: true,
    },
    mcqTestJson: {
      type: Schema.Types.Mixed,
      required: false,
      default: null,
    },
    mcqModel: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    mcqGeneratedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

mockPaperGenerationSchema.index({ user: 1, createdAt: -1 });

const MockPaperGeneration =
  mongoose.models.MockPaperGeneration ||
  mongoose.model("MockPaperGeneration", mockPaperGenerationSchema);

export default MockPaperGeneration;
