module api.form.inputtype.support {

    import Property = api.data.Property;
    import PropertyArray = api.data.PropertyArray;
    import Value = api.data.Value;
    import ValueType = api.data.ValueType;
    import InputTypeView = api.form.inputtype.InputTypeView;

    export class BaseInputTypeSingleOccurrence extends api.dom.DivEl implements InputTypeView {

        private context: api.form.inputtype.InputTypeViewContext;

        protected input: api.form.Input;

        private property: Property;

        private propertyListener: (event: api.data.PropertyValueChangedEvent) => void;

        protected ignorePropertyChange: boolean;

        private inputValidityChangedListeners: {(event: api.form.inputtype.InputValidityChangedEvent) : void}[] = [];

        private inputValueChangedListeners: {(event: api.form.inputtype.ValueChangedEvent): void}[] = [];

        constructor(ctx: api.form.inputtype.InputTypeViewContext, className?: string) {
            super('input-type-view' + ( className ? ' ' + className : ''));
            api.util.assertNotNull(ctx, 'CONTEXT cannot be null');
            this.context = ctx;

            this.propertyListener = (event: api.data.PropertyValueChangedEvent) => {
                if (!this.ignorePropertyChange) {
                    this.updateProperty(event.getProperty(), true).done();
                }
            };
        }

        availableSizeChanged() {
            // must be implemented by children
        }

        public getContext(): api.form.inputtype.InputTypeViewContext {
            return this.context;
        }

        getElement(): api.dom.Element {
            return this;
        }

        isManagingAdd(): boolean {
            return true;
        }

        layout(input: api.form.Input, propertyArray: PropertyArray): wemQ.Promise<void> {
            let property = propertyArray.get(0);
            this.registerProperty(property);

            this.layoutProperty(input, this.property);
            return wemQ<void>(null);
        }

        layoutProperty(_input: api.form.Input, _property: Property): wemQ.Promise<void> {

            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        update(propertyArray: PropertyArray, unchangedOnly?: boolean): wemQ.Promise<void> {
            let property = propertyArray.get(0);
            this.registerProperty(property);

            return this.updateProperty(this.property, unchangedOnly);
        }

        reset() {
            throw Error('Must be implemented in inheritors');
        }

        refresh() {
            //to be implemented on demand in inheritors
        }

        updateProperty(_property: Property, _unchangedOnly?: boolean): wemQ.Promise<void> {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        protected registerProperty(property: Property) {
            if (this.property) {
                this.property.unPropertyValueChanged(this.propertyListener);
            }
            if (property) {
                property.onPropertyValueChanged(this.propertyListener);
            }
            this.property = property;
        }

        protected saveToProperty(value: Value) {
            this.ignorePropertyChange = true;
            this.property.setValue(value);
            this.validate(false);
            this.ignorePropertyChange = false;
        }

        getProperty(): Property {
            return this.property;
        }

        getValueType(): ValueType {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        newInitialValue(): Value {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        displayValidationErrors(_value: boolean) {
            // must be implemented by children
        }

        hasValidUserInput(): boolean {
            return true;
        }

        validate(_silent: boolean = true): api.form.inputtype.InputValidationRecording {

            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        protected notifyValidityChanged(event: api.form.inputtype.InputValidityChangedEvent) {
            this.inputValidityChangedListeners.forEach((listener: (event: api.form.inputtype.InputValidityChangedEvent)=>void) => {
                listener(event);
            });
        }

        onValidityChanged(listener: (event: api.form.inputtype.InputValidityChangedEvent)=>void) {
            this.inputValidityChangedListeners.push(listener);
        }

        unValidityChanged(listener: (event: api.form.inputtype.InputValidityChangedEvent)=>void) {
            this.inputValidityChangedListeners.filter((currentListener: (event: api.form.inputtype.InputValidityChangedEvent)=>void) => {
                return listener === currentListener;
            });
        }

        onValueChanged(listener: (event: api.form.inputtype.ValueChangedEvent) => void) {
            this.inputValueChangedListeners.push(listener);
        }

        unValueChanged(listener: (event: api.form.inputtype.ValueChangedEvent) => void) {
            this.inputValueChangedListeners = this.inputValueChangedListeners.filter((curr) => {
                return curr !== listener;
            });
        }

        protected notifyValueChanged(event: api.form.inputtype.ValueChangedEvent) {
            this.inputValueChangedListeners.forEach((listener: (event: api.form.inputtype.ValueChangedEvent)=>void) => {
                listener(event);
            });
        }

        onFocus(_listener: (_event: FocusEvent) => void) {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        unFocus(_listener: (_event: FocusEvent) => void) {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        onBlur(_listener: (_event: FocusEvent) => void) {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        unBlur(_listener: (_event: FocusEvent) => void) {
            throw new Error('Must be implemented by inheritor: ' + api.ClassHelper.getClassName(this));
        }

        onEditContentRequest(_listener: (content: api.content.ContentSummary) => void) {
            // Adapter for InputTypeView method, to be implemented on demand in inheritors
        }

        unEditContentRequest(_listener: (content: api.content.ContentSummary) => void) {
            // Adapter for InputTypeView method, to be implemented on demand in inheritors
        }
    }
}
