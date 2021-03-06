module api.content {

    import SelectedOption = api.ui.selector.combobox.SelectedOption;
    import Option = api.ui.selector.Option;
    import RichComboBox = api.ui.selector.combobox.RichComboBox;
    import RichComboBoxBuilder = api.ui.selector.combobox.RichComboBoxBuilder;
    import ContentTreeSelectorItem = api.content.resource.ContentTreeSelectorItem;
    import Viewer = api.ui.Viewer;
    import ContentRowFormatter = api.content.util.ContentRowFormatter;
    import i18n = api.util.i18n;
    import OptionsFactory = api.ui.selector.OptionsFactory;
    import StringHelper = api.util.StringHelper;
    import OptionDataHelper = api.ui.selector.OptionDataHelper;
    import ModeTogglerButton = api.content.button.ModeTogglerButton;
    import SelectedOptionsView = api.ui.selector.combobox.SelectedOptionsView;
    import ComboBoxConfig = api.ui.selector.combobox.ComboBoxConfig;
    import ComboBox = api.ui.selector.combobox.ComboBox;

    export class ContentComboBox<ITEM_TYPE extends ContentTreeSelectorItem>
        extends RichComboBox<ContentTreeSelectorItem> {

        protected optionsFactory: OptionsFactory<ITEM_TYPE>;

        protected treegridDropdownEnabled: boolean;

        protected treeModeTogglerAllowed: boolean;

        protected initialTreeEnabledState: boolean;

        protected showAfterReload: boolean;

        protected preventReload: boolean;

        protected treeModeToggler: ModeTogglerButton;

        constructor(builder: ContentComboBoxBuilder<ITEM_TYPE>) {

            const loader = builder.loader || ContentSummaryOptionDataLoader.create().setLoadStatus(
                builder.showStatus).build();

            builder.setLoader(<ContentSummaryOptionDataLoader<ITEM_TYPE>>loader).setMaxHeight(230);

            if (builder.showStatus) {
                const columns = [new api.ui.grid.GridColumnBuilder().setId('status').setName('Status').setField(
                    'displayValue').setFormatter(
                    ContentRowFormatter.statusSelectorFormatter).setCssClass('status').setBoundaryWidth(75, 75).build()];

                builder.setCreateColumns(columns);
            }

            super(builder);

            this.addClass('content-combo-box');

            this.treegridDropdownEnabled = builder.treegridDropdownEnabled;
            this.initialTreeEnabledState = this.treegridDropdownEnabled;

            this.treeModeTogglerAllowed = builder.treeModeTogglerAllowed;
            if (this.treeModeTogglerAllowed) {
                this.initTreeModeToggler();
            }

            this.showAfterReload = false;

            this.optionsFactory = new OptionsFactory<ITEM_TYPE>(this.getLoader(), builder.optionDataHelper);
        }

        getLoader(): ContentSummaryOptionDataLoader<ITEM_TYPE> {
            return <ContentSummaryOptionDataLoader<ITEM_TYPE>> super.getLoader();
        }

        getContent(contentId: ContentId): ContentSummary {
            let option = this.getOptionByValue(contentId.toString());
            if (option) {
                return option.displayValue.getContent();
            }
            return null;
        }

        getComboBox(): ComboBox<ITEM_TYPE> {
            return <ComboBox<ITEM_TYPE>>super.getComboBox();
        }

        setContent(content: ContentSummary) {

            this.clearSelection();
            if (content) {
                let optionToSelect: Option<ContentTreeSelectorItem> = this.getOptionByValue(content.getContentId().toString());
                if (!optionToSelect) {
                    optionToSelect = this.createOption(content);
                    this.addOption(optionToSelect);
                }
                this.selectOption(optionToSelect);

            }
        }

        protected toggleGridOptions(_treeMode: boolean) {
            // May be overridden in deriving class if the grid should
            // have different settings in different modes

            return false;
        }

        private initTreeModeToggler() {

            this.treeModeToggler = new ModeTogglerButton();
            this.treeModeToggler.setActive(this.treegridDropdownEnabled);
            this.getComboBox().prependChild(this.treeModeToggler);

            this.treeModeToggler.onActiveChanged(isActive => {
                this.treegridDropdownEnabled = isActive;
                this.toggleGridOptions(isActive);
                if (!this.preventReload) {
                    this.reload(this.getComboBox().getInput().getValue());
                }
            });

            this.onLoaded(() => {
                if (this.showAfterReload) {
                    this.getComboBox().getInput().setReadOnly(false);
                    this.showAfterReload = false;
                }
            });

            this.treeModeToggler.onClicked(() => {
                this.giveFocus();
                this.showAfterReload = true;

                this.getComboBox().showDropdown();
                this.getComboBox().setEmptyDropdownText(i18n('field.search.inprogress'));
            });

            this.getComboBox().getInput().onValueChanged((event: ValueChangedEvent) => {

                if (this.initialTreeEnabledState && StringHelper.isEmpty(event.getNewValue())) {
                    if (!this.treeModeToggler.isActive()) {
                        this.preventReload = true;
                        this.treeModeToggler.setActive(true);
                        this.preventReload = false;
                    }
                    return;
                }

                if (this.treeModeToggler.isActive()) {
                    this.preventReload = true;
                    this.treeModeToggler.setActive(false);
                    this.preventReload = false;
                }

            });
        }

        protected createOptions(items: ITEM_TYPE[]): wemQ.Promise<Option<ITEM_TYPE>[]> {
            return this.optionsFactory.createOptions(items);
        }

        protected createOption(data: Object, readOnly?: boolean): Option<ITEM_TYPE> {

            let option;

            if (api.ObjectHelper.iFrameSafeInstanceOf(data, ContentTreeSelectorItem)) {
                option = this.optionsFactory.createOption(<ITEM_TYPE>data, readOnly);
            } else {
                option = {
                    value: (<ContentSummary>data).getId(),
                    displayValue: new ContentTreeSelectorItem(<ContentSummary>data)
                };
            }

            return option;
        }

        protected reload(inputValue: string): wemQ.Promise<any> {

            const deferred = wemQ.defer<void>();

            if (this.ifFlatLoadingMode(inputValue)) {
                this.getLoader().search(inputValue).then(() => {
                    deferred.resolve(null);
                }).catch((reason: any) => {
                    api.DefaultErrorHandler.handle(reason);
                }).done();
            } else {
                this.getLoader().setTreeFilterValue(inputValue);

                this.getComboBox().getComboBoxDropdownGrid().reload().then(() => {
                    if (this.getComboBox().isDropdownShown()) {
                        this.getComboBox().showDropdown();
                        this.getComboBox().getInput().setReadOnly(false);
                    }
                    this.notifyLoaded(this.getComboBox().getOptions().map(option => option.displayValue));

                    deferred.resolve(null);
                }).catch((reason: any) => {
                    api.DefaultErrorHandler.handle(reason);
                }).done();
            }

            return deferred.promise;
        }

        protected createComboboxConfig(builder: ContentComboBoxBuilder<ITEM_TYPE>): ComboBoxConfig<ContentTreeSelectorItem> {
            const config = super.createComboboxConfig(builder);
            config.treegridDropdownAllowed = builder.treegridDropdownEnabled || builder.treeModeTogglerAllowed;

            return config;
        }

        private ifFlatLoadingMode(inputValue: string): boolean {
            return !this.treegridDropdownEnabled || (!this.treeModeTogglerAllowed && !StringHelper.isEmpty(inputValue));
        }

        public static create(): ContentComboBoxBuilder<ContentTreeSelectorItem> {
            return new ContentComboBoxBuilder<ContentTreeSelectorItem>();
        }
    }

    export class ContentSelectedOptionsView
        extends api.ui.selector.combobox.BaseSelectedOptionsView<ContentTreeSelectorItem> {

        createSelectedOption(option: api.ui.selector.Option<ContentTreeSelectorItem>): SelectedOption<ContentTreeSelectorItem> {
            let optionView = !!option.displayValue ? new ContentSelectedOptionView(option) : new MissingContentSelectedOptionView(option);
            return new SelectedOption<ContentTreeSelectorItem>(optionView, this.count());
        }
    }

    export class MissingContentSelectedOptionView
        extends api.ui.selector.combobox.BaseSelectedOptionView<ContentTreeSelectorItem> {

        private id: string;

        constructor(option: api.ui.selector.Option<ContentTreeSelectorItem>) {
            super(option);
            this.id = option.value;
            this.setEditable(false);
        }

        protected appendActionButtons() {
            super.appendActionButtons();

            let message = new api.dom.H6El('missing-content');
            message.setHtml(i18n('field.content.noaccess', this.id));

            this.appendChild(message);
        }
    }

    export class ContentSelectedOptionView
        extends api.ui.selector.combobox.RichSelectedOptionView<ContentTreeSelectorItem> {

        constructor(option: api.ui.selector.Option<ContentTreeSelectorItem>) {
            super(
                new api.ui.selector.combobox.RichSelectedOptionViewBuilder<ContentTreeSelectorItem>(option)
                    .setEditable(true)
                    .setDraggable(true)
            );
        }

        resolveIconUrl(content: ContentTreeSelectorItem): string {
            return content.getIconUrl();
        }

        resolveTitle(content: ContentTreeSelectorItem): string {
            return content.getDisplayName().toString();
        }

        resolveSubTitle(content: ContentTreeSelectorItem): string {
            return content.getPath().toString();
        }

        protected onEditButtonClicked(e: MouseEvent) {
            let content = this.getOptionDisplayValue().getContent();
            let model = [api.content.ContentSummaryAndCompareStatus.fromContentSummary(content)];
            new api.content.event.EditContentEvent(model).fire();

            return super.onEditButtonClicked(e);
        }
    }

    export class ContentComboBoxBuilder<ITEM_TYPE extends ContentTreeSelectorItem>
        extends RichComboBoxBuilder<ContentTreeSelectorItem> {

        comboBoxName: string = 'contentSelector';

        selectedOptionsView: SelectedOptionsView<ContentTreeSelectorItem> =
            <SelectedOptionsView<ContentTreeSelectorItem>> new ContentSelectedOptionsView();

        loader: ContentSummaryOptionDataLoader<ContentTreeSelectorItem>;

        optionDataHelper: OptionDataHelper<ContentTreeSelectorItem> = new ContentSummaryOptionDataHelper();

        optionDisplayValueViewer: Viewer<any> = <Viewer<any>>new ContentSummaryViewer();

        maximumOccurrences: number = 0;

        delayedInputValueChangedHandling: number = 750;

        minWidth: number;

        value: string;

        displayMissingSelectedOptions: boolean;

        removeMissingSelectedOptions: boolean;

        showStatus: boolean = false;

        treegridDropdownEnabled: boolean = false;

        treeModeTogglerAllowed: boolean = true;

        setTreegridDropdownEnabled(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            this.treegridDropdownEnabled = value;
            return this;
        }

        setTreeModeTogglerAllowed(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            this.treeModeTogglerAllowed = value;
            return this;
        }

        setShowStatus(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            this.showStatus = value;
            return this;
        }

        setMaximumOccurrences(maximumOccurrences: number): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setMaximumOccurrences(maximumOccurrences);
            return this;
        }

        setComboBoxName(value: string): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setComboBoxName(value);
            return this;
        }

        setSelectedOptionsView(selectedOptionsView: SelectedOptionsView<ITEM_TYPE>): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setSelectedOptionsView(selectedOptionsView);
            return this;
        }

        setLoader(loader: ContentSummaryOptionDataLoader<ITEM_TYPE>): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setLoader(loader);
            return this;
        }

        setMinWidth(value: number): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setMinWidth(value);
            return this;
        }

        setValue(value: string): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setValue(value);
            return this;
        }

        setDelayedInputValueChangedHandling(value: number): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setDelayedInputValueChangedHandling(value ? value : 750);
            return this;
        }

        setDisplayMissingSelectedOptions(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setDisplayMissingSelectedOptions(value);
            return this;
        }

        setRemoveMissingSelectedOptions(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setRemoveMissingSelectedOptions(value);
            return this;
        }

        setSkipAutoDropShowOnValueChange(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setSkipAutoDropShowOnValueChange(value);
            return this;
        }

        setOptionDisplayValueViewer(value: Viewer<any>): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setOptionDisplayValueViewer(value ? value : new api.content.ContentSummaryViewer());
            return this;
        }

        setOptionDataHelper(value: OptionDataHelper<ITEM_TYPE>): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setOptionDataHelper(value);
            return this;
        }

        setHideComboBoxWhenMaxReached(value: boolean): ContentComboBoxBuilder<ITEM_TYPE> {
            super.setHideComboBoxWhenMaxReached(value);
            return this;
        }

        build(): ContentComboBox<ITEM_TYPE> {
            return new ContentComboBox<ITEM_TYPE>(this);
        }

    }
}
